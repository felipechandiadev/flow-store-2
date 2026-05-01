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
  availableStock: number;
  committedStock: number;
};

export type StockGridRow = {
  id: string;
  variantId: string;
  productId: string | null;
  productName: string;
  sku: string;
  unitOfMeasure: string;
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
