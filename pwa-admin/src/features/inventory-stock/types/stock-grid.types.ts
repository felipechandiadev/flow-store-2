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
  maximumStockOverride?: number | null;
  reorderPointOverride?: number | null;
  effectiveMinimumStock?: number;
  effectiveMaximumStock?: number;
  effectiveReorderPoint?: number;
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
  attributeValues: Record<string, string>;
  totalStock: number;
  availableStock: number;
  inventoryValueCost: number;
  pmp: number;
  pmpValue: number;
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
