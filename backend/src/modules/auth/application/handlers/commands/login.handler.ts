import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { LoginCommand } from '../../commands/login.command';
import { LoginEvent } from '../../../domain/events/login.event';
import { PasswordUpgradedEvent } from '../../../domain/events/password-upgraded.event';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
} from '@modules/auth/application/ports/auth.repository.port';

export interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    userName: string;
    email: string;
    rol: string;
    person?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    };
  };
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

    // Build response
    return {
      success: true,
      user: {
        id: user.id,
        userName: user.userName,
        email: user.mail,
        rol: user.rol,
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
    };
  }
}
