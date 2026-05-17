/**
 * Orígenes permitidos en `next dev` para acceder desde la red local (tablets, otros PCs).
 * Usa comodines RFC-style de Next.js (ver csrf-protection / allowedDevOrigins).
 */
const PRIVATE_LAN_ORIGIN_PATTERNS: string[] = [
  "192.168.*",
  "10.*.*.*",
  "172.16.*",
  "172.17.*",
  "172.18.*",
  "172.19.*",
  "172.20.*",
  "172.21.*",
  "172.22.*",
  "172.23.*",
  "172.24.*",
  "172.25.*",
  "172.26.*",
  "172.27.*",
  "172.28.*",
  "172.29.*",
  "172.30.*",
  "172.31.*",
];

function hostnameFromEnvUrl(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Lista para `allowedDevOrigins` en next.config (dev, red local). */
export function buildLanAllowedDevOrigins(): string[] {
  const extra =
    process.env.ALLOWED_DEV_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const fromNextAuth = hostnameFromEnvUrl(process.env.NEXTAUTH_URL);
  const fromPublicApp = hostnameFromEnvUrl(process.env.NEXT_PUBLIC_APP_URL);

  return [
    ...PRIVATE_LAN_ORIGIN_PATTERNS,
    ...extra,
    ...(fromNextAuth ? [fromNextAuth] : []),
    ...(fromPublicApp && fromPublicApp !== fromNextAuth ? [fromPublicApp] : []),
  ];
}
