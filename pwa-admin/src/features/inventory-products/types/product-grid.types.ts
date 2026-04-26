export type ProductPriceListItemRow = {
  priceListId: string;
  priceListName: string;
  currency: string;
  netPrice: number;
  grossPrice: number;
  taxIds?: string[];
};

export type ProductVariantMediaAsset = {
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
};

export type ProductVariantGridRow = {
  id: string;
  sku: string;
  productId?: string | null;
  unitId?: string | null;
  barcode?: string | null;
  unitOfMeasure?: string | null;
  isActive?: boolean;
  basePrice?: number;
  baseCost?: number;
  /** Precio medio ponderado (inventario); 0 si no aplica. */
  pmp?: number;
  /** Nombre legible derivado de atributos (API). */
  displayName?: string | null;
  /** Mapa attributeId → valor de opción. */
  attributeValues?: Record<string, string>;
  trackInventory?: boolean;
  allowNegativeStock?: boolean;
  weight?: number | null;
  weightUnit?: string | null;
  primaryImageUrl?: string | null;
  mediaAssets?: ProductVariantMediaAsset[];
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
