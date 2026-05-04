/** Clave en `localStorage` para resultados por página del buscador de variantes (documento de compra). */
export const PURCHASE_DOC_VARIANT_SEARCH_LS_KEY = "flowstore.purchaseDocVariantSearch.pageSize";

export const PURCHASE_DOC_VARIANT_SEARCH_DEFAULT_PAGE_SIZE = 10;
export const PURCHASE_DOC_VARIANT_SEARCH_MIN = 1;
export const PURCHASE_DOC_VARIANT_SEARCH_MAX = 50;

export function clampPurchaseDocVariantSearchPageSize(n: number): number {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) {
    return PURCHASE_DOC_VARIANT_SEARCH_DEFAULT_PAGE_SIZE;
  }
  return Math.min(PURCHASE_DOC_VARIANT_SEARCH_MAX, Math.max(PURCHASE_DOC_VARIANT_SEARCH_MIN, x));
}

/** Solo en cliente; en SSR devolver el default. */
export function readPurchaseDocVariantSearchPageSize(): number {
  if (typeof window === "undefined") {
    return PURCHASE_DOC_VARIANT_SEARCH_DEFAULT_PAGE_SIZE;
  }
  try {
    const raw = window.localStorage.getItem(PURCHASE_DOC_VARIANT_SEARCH_LS_KEY);
    if (raw == null || raw === "") {
      return PURCHASE_DOC_VARIANT_SEARCH_DEFAULT_PAGE_SIZE;
    }
    return clampPurchaseDocVariantSearchPageSize(parseInt(raw, 10));
  } catch {
    return PURCHASE_DOC_VARIANT_SEARCH_DEFAULT_PAGE_SIZE;
  }
}

export function writePurchaseDocVariantSearchPageSize(n: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      PURCHASE_DOC_VARIANT_SEARCH_LS_KEY,
      String(clampPurchaseDocVariantSearchPageSize(n)),
    );
  } catch {
    // ignore quota / private mode
  }
}
