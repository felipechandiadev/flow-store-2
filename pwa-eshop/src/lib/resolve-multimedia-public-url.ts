import { getServerBackendApiBase } from "./backend-api-url";

/**
 * El backend guarda rutas relativas (`/multimedia/files/...`).
 * En `<img src>` hay que prefijar la URL del API.
 */
export function resolveMultimediaPublicUrl(publicUrl: string | null | undefined): string | null {
  const u = publicUrl?.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;

  let base: string;
  try {
    base = getServerBackendApiBase();
  } catch {
    return u;
  }

  const apiPrefix = (process.env.BACKEND_API_PREFIX || "api").replace(/^\/+|\/+$/g, "");
  if (u.startsWith("/api/")) return `${base}${u}`;
  if (u.startsWith("/")) return `${base}/${apiPrefix}${u}`;
  return `${base}/${apiPrefix}/${u}`;
}
