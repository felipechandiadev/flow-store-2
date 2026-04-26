export type ProductPriceListItemRow = {
  priceListId: string;
  priceListName: string;
  currency: string;
  netPrice: number;
  grossPrice: number;
  taxIds?: string[];
};

export type ProductVariantGridRow = {
  id: string;
  sku: string;
  barcode?: string | null;
  unitOfMeasure?: string | null;
  isActive?: boolean;
  basePrice?: number;
  baseCost?: number;
  priceListItems: ProductPriceListItemRow[];
};

export type ProductGridRow = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  isActive: boolean;
  variantCount: number;
  variants: ProductVariantGridRow[];
};
