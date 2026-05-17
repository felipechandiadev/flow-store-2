export type StockStorageBreakdown = {
  storageId: string;
  storageName: string;
  branchName: string | null;
  quantity: number;
  availableStock: number;
  committedStock: number;
  stockLevelId?: string | null;
};

export type VariantStockRow = {
  variantId: string;
  productName: string;
  sku: string;
  stockUnitSymbol: string;
  storageBreakdown: StockStorageBreakdown[];
};

export type StorageOption = {
  id: string;
  name: string;
  branchName: string | null;
};
