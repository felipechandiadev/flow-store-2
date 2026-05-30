/**
 * Habilita el módulo eShop en este despliegue del admin.
 * `NEXT_PUBLIC_ESHOP_ENABLED=false` oculta navegación y ajustes de eShop;
 * otras pantallas pueden importar `isEShopModuleEnabled()` para el mismo criterio.
 */
function parseEnvFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

export function isEShopModuleEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_ESHOP_ENABLED, true);
}
