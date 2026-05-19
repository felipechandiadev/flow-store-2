/** Clave en `localStorage` para `pageSize` del buscador StockControl. */
export const VARIANT_SEARCH_LS_KEY = "flowstore.stockVariantSearch.pageSize";

export const VARIANT_SEARCH_DEFAULT_PAGE_SIZE = 20;
export const VARIANT_SEARCH_MIN = 1;
export const VARIANT_SEARCH_MAX = 50;

export function clampVariantSearchPageSize(n: number): number {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) {
    return VARIANT_SEARCH_DEFAULT_PAGE_SIZE;
  }
  return Math.min(VARIANT_SEARCH_MAX, Math.max(VARIANT_SEARCH_MIN, x));
}

/** Solo en cliente; en SSR devolver el default. */
export function readVariantSearchPageSize(): number {
  if (typeof window === "undefined") {
    return VARIANT_SEARCH_DEFAULT_PAGE_SIZE;
  }
  try {
    const raw = window.localStorage.getItem(VARIANT_SEARCH_LS_KEY);
    if (raw == null || raw === "") {
      return VARIANT_SEARCH_DEFAULT_PAGE_SIZE;
    }
    return clampVariantSearchPageSize(parseInt(raw, 10));
  } catch {
    return VARIANT_SEARCH_DEFAULT_PAGE_SIZE;
  }
}

export function writeVariantSearchPageSize(n: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(VARIANT_SEARCH_LS_KEY, String(clampVariantSearchPageSize(n)));
  } catch {
    // ignore quota / private mode
  }
}
