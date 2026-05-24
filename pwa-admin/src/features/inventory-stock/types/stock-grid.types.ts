export type StockMovementRow = {
  transactionId: string;
  documentNumber: string;
  transactionType: string;
  createdAt: string;
  quantity: number;
  notes?: string | null;
  storageName?: string | null;
  targetStorageName?: string | null;
  direction: "IN" | "OUT";
};

export type StockStorageBreakdownRow = {
  storageId: string;
  storageName: string;
  branchName: string | null;
  quantity: number;
  reservedStock: number;
  availableStock: number;
  committedStock: number;
  stockLevelId?: string | null;
  minimumStockOverride?: number | null;
  minimumStockEnabledOverride?: boolean | null;
  maximumStockOverride?: number | null;
  maximumStockEnabledOverride?: boolean | null;
  reorderPointOverride?: number | null;
  reorderPointEnabledOverride?: boolean | null;
  effectiveMinimumStock?: number;
  effectiveMinimumStockEnabled?: boolean;
  effectiveMaximumStock?: number;
  effectiveMaximumStockEnabled?: boolean;
  effectiveReorderPoint?: number;
  effectiveReorderPointEnabled?: boolean;
};

export type StockGridRow = {
  id: string;
  variantId: string;
  productId: string | null;
  productName: string;
  sku: string;
  barcode: string;
  unitOfMeasure: string;
  /** Unidad de venta (POS); puede coincidir con stock si son la misma. */
  saleUnitOfMeasure: string;
  /** Símbolo corto para etiquetas compactas (p. ej. g, ml). */
  stockUnitSymbol: string;
  /** Símbolo corto unidad de venta (p. ej. UN). */
  saleUnitSymbol: string;
  /** Stock base por 1 unidad de venta en conteo; null si no hay puente conteo. */
  stockBaseQtyPerCountSaleUnit: number | null;
  stockBaseUnitId?: string;
  saleUnitId?: string;
  /** Cantidad en unidad base de stock equivalente a 1 unidad de venta (conversión UOM). */
  stockBaseQtyPerSaleUnit?: number | null;
  attributeValues: Record<string, string>;
  totalStock: number;
  availableStock: number;
  inventoryValueCost: number;
  pmp: number | null;
  pmpValue: number | null;
  isBelowMinimum: boolean;
  primaryStorageName: string;
  primaryStorageQuantity: number;
  storageBreakdown: StockStorageBreakdownRow[];
  movements: StockMovementRow[];
};

export type ListStockForGridInput = {
  search: string;
  storageId?: string;
  branchId?: string;
  page: number;
  limit: number;
  sortField: string;
  sort: "asc" | "desc";
};

export type ListStockForGridResult = {
  rows: StockGridRow[];
  total: number;
  page: number;
  limit: number;
};
