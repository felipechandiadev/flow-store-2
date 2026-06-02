export type EShopStorefront = {
  companyName: string;
  companyLogoUrl: string | null;
  slug: string;
  tagline: string | null;
  brandManifest: string | null;
  publicContact: {
    email?: string;
    phone?: string;
    instagram?: string;
    tiktok?: string;
    facebook?: string;
  };
  eShopEnabled: boolean;
  eShopFreeShippingThreshold: number | null;
  eShopFeaturedProductIds?: string[];
  eShopFeaturedProductVariantIds: string[];
};

export type EShopProductCard = {
  id: string;
  name: string;
  basePrice: number;
  imageUrl: string | null;
  inStock: boolean;
  defaultVariantId: string | null;
};

export type EShopCatalogMultimediaItem = {
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
  isPrimary?: boolean;
};

export type EShopCatalogProductVariant = {
  id: string;
  sku: string;
  attributeValues: Record<string, string>;
  basePrice: number;
  inStock: boolean;
  multimedia: EShopCatalogMultimediaItem[];
};

export type EShopCatalogProductDetail = {
  product: {
    id: string;
    name: string;
    brand: string | null;
    categoryName: string | null;
    description: string | null;
    productType: string;
    multimedia: EShopCatalogMultimediaItem[];
  };
  variants: EShopCatalogProductVariant[];
  attributeOptions: Record<string, string[]>;
  defaultVariantId: string | null;
};

export type EShopHeroSlide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  ctaStyle: "none" | "button" | "link";
  textAlign: "left" | "center" | "right";
  overlayOpacity: number;
  textColor?: string | null;
  imageUrl: string | null;
};

export type EShopTestimonial = {
  id: string;
  clientName: string;
  rating: number;
  message: string;
  avatarUrl: string | null;
};

export type EShopBranch = {
  id: string;
  name: string;
  address?: string | null;
  location?: { lat: number; lng: number } | null;
};
