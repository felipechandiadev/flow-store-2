import type { VariantPriceListItem } from "@/features/variant-pricing/types/pricing.types";

export type VariantLookupItem = {
  variantId: string;
  sku: string;
  barcode: string | null;
  productName: string;
  attributeValues: Record<string, string>;
};

export type VariantDetail = VariantLookupItem & {
  productId: string | null;
  unitOfMeasure: string;
  pmp: number | null;
  priceListItems: VariantPriceListItem[];
};
