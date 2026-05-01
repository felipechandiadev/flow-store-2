/** Fila devuelta por `GET /product-variants/purchasing-search`. */
export type PurchasingVariantSearchItem = {
  id: string;
  productId: string;
  productName: string;
  categoryName: string | null;
  sku: string;
  barcode: string | null;
  pmp: number;
  attributeValues: Record<string, string>;
  unitLabel: string | null;
  defaultTaxIds: string[];
};

export type PurchasingVariantSearchResult = {
  items: PurchasingVariantSearchItem[];
  page: number;
  pageSize: number;
  total: number;
};
