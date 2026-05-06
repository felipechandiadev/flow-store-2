/** Clave en `localStorage` para `pageSize` del buscador POS (mismo patrón que `purchaseDocVariantSearchStorage`). */

export const POS_PRODUCT_SEARCH_LS_KEY = "flowstore.posProductSearch.pageSize";

/** Mismo criterio que `PURCHASE_DOC_SEARCH_DEBOUNCE_MS` en pwa-admin (PurchaseDocumentVariantSearchPanel). */
export const POS_PRODUCT_SEARCH_DEBOUNCE_MS = 400;

export const POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE = 20;
export const POS_PRODUCT_SEARCH_MIN = 1;
export const POS_PRODUCT_SEARCH_MAX = 50;

export function clampPosProductSearchPageSize(n: number): number {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) {
    return POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE;
  }
  return Math.min(POS_PRODUCT_SEARCH_MAX, Math.max(POS_PRODUCT_SEARCH_MIN, x));
}

/** Solo en cliente; en SSR devolver el default. */
export function readPosProductSearchPageSize(): number {
  if (typeof window === "undefined") {
    return POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE;
  }
  try {
    const raw = window.localStorage.getItem(POS_PRODUCT_SEARCH_LS_KEY);
    if (raw == null || raw === "") {
      return POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE;
    }
    return clampPosProductSearchPageSize(parseInt(raw, 10));
  } catch {
    return POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE;
  }
}

export function writePosProductSearchPageSize(n: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(POS_PRODUCT_SEARCH_LS_KEY, String(clampPosProductSearchPageSize(n)));
  } catch {
    // ignore quota / private mode
  }
}
