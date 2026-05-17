/**
 * URLs del backend NestJS.
 * - Servidor Next (Server Actions, login): BACKEND_API_URL
 * - Navegador (WebSocket stock, etc.): NEXT_PUBLIC_BACKEND_API_URL
 *
 * En red local use la IP del host (p. ej. http://192.168.1.10:3020), no localhost,
 * si el POS se abre desde otro equipo.
 */
export function getServerBackendApiBase(): string {
  const base =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();
  if (!base) {
    throw new Error(
      "BACKEND_API_URL no está definida. En red local use la IP LAN del servidor, p. ej. http://192.168.1.10:3020",
    );
  }
  return base.replace(/\/$/, "");
}

export function getClientBackendApiBase(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/\/$/, "");
}
