export const SCAN_PATH = "/scan";
export const SEARCH_PATH = "/search";

export function variantDetailPath(variantId: string): string {
  return `/variant/${encodeURIComponent(variantId.trim())}`;
}

export function variantBarcodePath(variantId: string): string {
  return `${variantDetailPath(variantId)}/barcode`;
}

/** Rutas a revalidar tras mutaciones de inventario/variante */
export const VARIANT_REVALIDATE_PATHS = [SCAN_PATH, SEARCH_PATH, "/variant"] as const;
