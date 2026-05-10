import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import {
  ForbiddenException,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { LoginCommand } from '../../commands/login.command';
import { LoginEvent } from '../../../domain/events/login.event';
import { PasswordUpgradedEvent } from '../../../domain/events/password-upgraded.event';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
} from '@modules/auth/application/ports/auth.repository.port';
import { Company } from '@modules/companies/domain/company.entity';
import { UserRole } from '@modules/users/domain/user.entity';

export interface LoginCompanyOption {
  id: string;
  razonSocial: string;
  nombreFantasia: string | null;
}

export interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    userName: string;
    email: string;
    rol: string;
    /** Empresa fija del operador. NULL para ADMIN. */
    companyId: string | null;
    person?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    };
  };
  /** Empresa activa al iniciar sesión.
   *  - OPERATOR: igual a user.companyId.
   *  - ADMIN: la primera empresa activa (cliente puede cambiar via switch-company).
   */
  activeCompanyId?: string | null;
  /** Solo para ADMIN: empresas disponibles para switchear. */
  companies?: LoginCompanyOption[] | null;
}

@CommandHandler(LoginCommand)
export class LoginCommandHandler implements ICommandHandler<
  LoginCommand,
  LoginResult
> {
  private readonly logger = new Logger(LoginCommandHandler.name);

  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepositoryPort,
    private readonly eventBus: EventBus,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    this.logger.debug(`Login attempt for user: ${command.userName}`);

    const user = await this.authRepository.findUserByUsername(command.userName);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verify password - support both bcrypt and legacy SHA256
    let isValid = false;
    let passwordWasUpgraded = false;

    if (user.pass?.startsWith('$2')) {
      // bcrypt hash
      isValid = await bcrypt.compare(command.password, user.pass);
    } else if (user.pass) {
      // Legacy SHA256 hash - upgrade to bcrypt if valid
      const legacyHash = crypto
        .createHash('sha256')
        .update(command.password)
        .digest('hex');
      if (legacyHash === user.pass) {
        isValid = true;
        try {
          const upgradedHash = await bcrypt.hash(command.password, 12);
          user.pass = upgradedHash;
          await this.authRepository.saveUser(user);
          passwordWasUpgraded = true;
          this.logger.debug(`Password upgraded for user: ${user.id}`);
        } catch (upgradeError) {
          this.logger.error('Error upgrading password hash:', upgradeError);
        }
      }
    }

    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Publish login event
    const loginEvent = new LoginEvent(user.id, user.userName, user.rol);
    loginEvent.aggregateId = user.id;
    loginEvent.aggregateVersion = 1;
    loginEvent.correlationId = user.id;
    this.eventBus.publish(loginEvent);

    // Publish password upgraded event if applicable
    if (passwordWasUpgraded) {
      const upgradeEvent = new PasswordUpgradedEvent(user.id);
      upgradeEvent.aggregateId = user.id;
      upgradeEvent.aggregateVersion = 2;
      upgradeEvent.correlationId = user.id;
      this.eventBus.publish(upgradeEvent);
    }

    // Resolve tenancy context for the response
    let activeCompanyId: string | null = user.companyId ?? null;
    let companies: LoginCompanyOption[] | null = null;
    const hint =
      command.companyHint && isUUID(String(command.companyHint))
        ? String(command.companyHint)
        : null;

    if (user.rol === UserRole.OPERATOR) {
      // Si el cliente (POS) declara una empresa, debe coincidir con la del operador.
      if (hint && user.companyId && hint !== user.companyId) {
        throw new ForbiddenException(
          'Este usuario no pertenece a la empresa solicitada por este punto de venta',
        );
      }
    } else if (user.rol === UserRole.ADMIN) {
      const all = await this.companyRepository.find({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });
      companies = all.map((c) => ({
        id: c.id,
        razonSocial: c.razonSocial,
        nombreFantasia: c.nombreFantasia ?? null,
      }));
      if (hint) {
        const match = companies.find((c) => c.id === hint);
        if (!match) {
          throw new ForbiddenException(
            'La empresa solicitada por este cliente no está disponible',
          );
        }
        activeCompanyId = match.id;
      } else {
        activeCompanyId = companies.length > 0 ? companies[0].id : null;
      }
    }

    // Build response
    return {
      success: true,
      user: {
        id: user.id,
        userName: user.userName,
        email: user.mail,
        rol: user.rol,
        companyId: user.companyId ?? null,
        person: user.person
          ? {
              id: user.person.id,
              firstName: user.person.firstName,
              lastName: user.person.lastName || '',
              email: user.person.email || null,
              phone: user.person.phone || null,
            }
          : undefined,
      },
      activeCompanyId,
      companies,
    };
  }
}
