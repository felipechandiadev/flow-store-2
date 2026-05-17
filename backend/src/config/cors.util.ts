import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const ALLOW_ALL_TOKENS = new Set(['', '*', 'all', 'true', 'any']);

/**
 * `origin: true` refleja el Origin de cada petición (LAN, localhost, IP, etc.).
 * Lista separada por comas = solo esos orígenes.
 */
export function buildCorsOriginOption(
  configuredOrigin: string,
  credentials: boolean,
): CorsOptions['origin'] {
  const configured = configuredOrigin.trim();

  if (ALLOW_ALL_TOKENS.has(configured)) {
    if (credentials) {
      return (origin, callback) => {
        callback(null, origin ?? true);
      };
    }
    return true;
  }

  const allowed = configured
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowed.length === 0) {
    return true;
  }

  if (allowed.length === 1 && !credentials) {
    return allowed[0];
  }

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowed.includes(origin)) {
      callback(null, origin);
      return;
    }
    callback(new Error(`CORS: origen no permitido (${origin})`));
  };
}

export function resolveCorsAllowOriginHeader(
  configuredOrigin: string,
  credentials: boolean,
  requestOrigin: string,
): string {
  const configured = configuredOrigin.trim();

  if (ALLOW_ALL_TOKENS.has(configured)) {
    if (credentials && requestOrigin) {
      return requestOrigin;
    }
    if (requestOrigin) {
      return requestOrigin;
    }
    return '*';
  }

  const allowed = configured
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }
  if (allowed.length > 0) {
    return allowed[0];
  }
  return requestOrigin || '*';
}

export const CORS_ALLOWED_HEADERS =
  'Authorization,Content-Type,X-Active-Company-Id,x-active-company-id,Accept,Origin,X-Requested-With';

export const CORS_ALLOWED_METHODS =
  'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';
