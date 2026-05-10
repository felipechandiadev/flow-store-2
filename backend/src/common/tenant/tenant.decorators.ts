import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_KEY = 'skipTenant';

/**
 * Marca una ruta o controller como público (no requiere autenticación ni tenant).
 * Usar con cuidado: solo para login, health checks, etc.
 */
export const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true);

export const ADMIN_ONLY_KEY = 'adminOnly';

/**
 * Marca una ruta como exclusiva para usuarios con rol ADMIN (super-admin global).
 * El TenantGuard rechazará el request si el usuario es OPERATOR.
 */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);

export const ALLOW_ADMIN_WITHOUT_COMPANY_KEY = 'allowAdminWithoutCompany';

/**
 * Permite que un ADMIN ejecute esta ruta SIN seleccionar una company activa.
 * Útil para endpoints que listan/gestionan todas las companies.
 * No aplica a OPERATOR (que siempre requiere company).
 */
export const AllowAdminWithoutCompany = () =>
  SetMetadata(ALLOW_ADMIN_WITHOUT_COMPANY_KEY, true);
