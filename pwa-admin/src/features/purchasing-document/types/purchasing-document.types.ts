/** Fila devuelta por `GET /product-variants/purchasing-search`. */
export type PurchasingVariantSearchItem = {
  id: string;
  productId: string;
  productName: string;
  categoryName: string | null;
  sku: string;
  barcode: string | null;
  /** PMP por unidad base de stock (p. ej. ml). */
  pmp: number | null;
  /** Costo sugerido por unidad de compra (p. ej. L), derivado del PMP. */
  suggestedPurchaseUnitCost?: number | null;
  purchaseUnitLabel?: string | null;
  stockBaseUnitLabel?: string | null;
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

/** `GET /product-variants/:id/purchase-insights` */
export type VariantPurchaseInsightsPmpPoint = {
  at: string;
  pmp: number;
};

export type VariantPurchaseInsightsPurchaseRow = {
  transactionId: string | null;
  documentNumber: string | null;
  date: string | null;
  quantity: number;
  unitLabel: string | null;
  supplierName: string | null;
  destinationName: string | null;
  unitCost: number | null;
};

export type VariantPurchaseInsights = {
  variant: {
    id: string;
    productName: string;
    sku: string;
    attributeValues: Record<string, string>;
    pmp: number | null;
    stockBaseUnitLabel: string | null;
    purchaseUnitLabel: string | null;
  };
  pmpSeries: VariantPurchaseInsightsPmpPoint[];
  recentPurchases: VariantPurchaseInsightsPurchaseRow[];
};
