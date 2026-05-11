import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository } from 'typeorm';
import { User, UserRole } from '@modules/users/domain/user.entity';
import { Company } from '@modules/companies/domain/company.entity';
import {
  ADMIN_ONLY_KEY,
  ALLOW_ADMIN_WITHOUT_COMPANY_KEY,
  SKIP_TENANT_KEY,
  SUPER_ADMIN_ONLY_KEY,
} from './tenant.decorators';
import type { CurrentUserPayload } from './current-user.decorator';

const ACTIVE_COMPANY_HEADER = 'x-active-company-id';

/**
 * Resuelve el contexto de tenant para cada request.
 * - Lee Authorization: Bearer <userId> (compatibilidad con el esquema actual de NextAuth → backend).
 * - Carga el usuario.
 * - Determina la activeCompanyId:
 *     ADMIN/OPERATOR → user.companyId (obligatorio, fijo).
 *     SUPER_ADMIN    → header X-Active-Company-Id (validado contra companies).
 * - Inyecta `req.currentUser` y `req.activeCompanyId`.
 *
 * Skips: rutas con @SkipTenant() (p. ej. /auth/login, /health).
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context.switchToHttp().getRequest();
    const auth: string | undefined =
      req.headers?.authorization || req.headers?.Authorization;
    const bearer = auth?.startsWith('Bearer ')
      ? auth.slice('Bearer '.length).trim()
      : null;

    if (!bearer || !isUUID(bearer)) {
      throw new UnauthorizedException(
        'Token de autenticación inválido o ausente',
      );
    }

    const user = await this.userRepository.findOne({ where: { id: bearer } });
    if (!user) {
      throw new UnauthorizedException('Sesión inválida');
    }

    const currentUser: CurrentUserPayload = {
      id: user.id,
      userName: user.userName,
      rol: user.rol,
      companyId: user.companyId ?? null,
    };
    req.currentUser = currentUser;

    const superAdminOnly = this.reflector.getAllAndOverride<boolean>(
      SUPER_ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (superAdminOnly && user.rol !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Acceso restringido a super-administradores',
      );
    }

    const adminOnly = this.reflector.getAllAndOverride<boolean>(
      ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (
      adminOnly &&
      user.rol !== UserRole.ADMIN &&
      user.rol !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Acceso restringido a administradores');
    }

    const allowAdminWithoutCompany =
      this.reflector.getAllAndOverride<boolean>(
        ALLOW_ADMIN_WITHOUT_COMPANY_KEY,
        [context.getHandler(), context.getClass()],
      );

    let activeCompanyId: string | null = null;

    if (user.rol === UserRole.SUPER_ADMIN) {
      const headerVal = req.headers?.[ACTIVE_COMPANY_HEADER];
      const headerCompanyId =
        typeof headerVal === 'string'
          ? headerVal
          : Array.isArray(headerVal)
            ? headerVal[0]
            : null;

      if (headerCompanyId && isUUID(headerCompanyId)) {
        const exists = await this.companyRepository.findOne({
          where: { id: headerCompanyId },
          select: { id: true, isActive: true },
        });
        if (!exists) {
          throw new ForbiddenException('Empresa activa no encontrada');
        }
        if (!exists.isActive) {
          throw new ForbiddenException('La empresa activa está inactiva');
        }
        activeCompanyId = headerCompanyId;
      } else if (!allowAdminWithoutCompany) {
        // Fallback: usar la primera empresa activa (compat con instalaciones single-company).
        const fallback = await this.companyRepository.findOne({
          where: { isActive: true },
          order: { createdAt: 'ASC' },
          select: { id: true },
        });
        if (fallback) activeCompanyId = fallback.id;
      }
    } else {
      // ADMIN y OPERATOR: empresa fija, tomada del usuario.
      if (!user.companyId) {
        throw new ForbiddenException(
          'Usuario sin empresa asignada. Contacte al administrador.',
        );
      }
      activeCompanyId = user.companyId;
    }

    if (!activeCompanyId && !allowAdminWithoutCompany) {
      throw new ForbiddenException(
        'No hay empresa activa para esta sesión. Selecciona una empresa.',
      );
    }

    req.activeCompanyId = activeCompanyId;
    return true;
  }
}
