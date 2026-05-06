export type PosProductAttribute = {
  attributeId: string;
  attributeName: string;
  attributeValue: string;
};

export type PosProductSearchItem = {
  productId: string;
  productName: string;
  productDescription: string | null;
  productImageUrl: string | null;
  variantId: string;
  sku: string | null;
  barcode: string | null;
  unitSymbol: string | null;
  unitId: string | null;
  unitPrice: number;
  unitTaxRate: number;
  unitTaxAmount: number;
  unitPriceWithTax: number;
  trackInventory: boolean;
  availableStock: number | null;
  availableStockBase: number | null;
  attributes: PosProductAttribute[];
  metadata: Record<string, unknown> | null;
};

export type PosProductSearchPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PosProductSearchResponse =
  | {
      success: true;
      query: string;
      pagination: PosProductSearchPagination;
      products: PosProductSearchItem[];
    }
  | { success: false; message: string };
