import type { Metadata } from "next";
import type { EShopCatalogProductDetail } from "../types/storefront.types";
import { buildProductDetailCanonicalUrl } from "@/lib/eshop-site-url";
import { buildProductDetailGallery } from "./product-detail-gallery";
import { resolveInitialVariant } from "./variant-selection";

const MAX_OG_DESCRIPTION = 160;

function truncateDescription(text: string | null | undefined): string {
  const raw = text?.trim() || "";
  if (!raw) {
    return "Compra en nuestra tienda en línea.";
  }
  if (raw.length <= MAX_OG_DESCRIPTION) {
    return raw;
  }
  return `${raw.slice(0, MAX_OG_DESCRIPTION - 1).trim()}…`;
}

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function pickOgImageUrl(detail: EShopCatalogProductDetail, variantId?: string | null): string | undefined {
  const variant = resolveInitialVariant(
    detail.variants,
    variantId,
    detail.defaultVariantId,
  );

  const variantImage =
    variant?.multimedia.find((m) => m.isPrimary && isImageMime(m.mimeType)) ??
    variant?.multimedia.find((m) => isImageMime(m.mimeType));

  if (variantImage?.publicUrl?.trim()) {
    return variantImage.publicUrl.trim();
  }

  const { gallery } = buildProductDetailGallery(detail.product.multimedia, detail.variants);
  const fromGallery = gallery.find((m) => isImageMime(m.mimeType));
  if (fromGallery?.publicUrl?.trim()) {
    return fromGallery.publicUrl.trim();
  }

  return undefined;
}

export type ProductDetailSeo = {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl?: string;
};

export function buildProductDetailSeo(
  detail: EShopCatalogProductDetail,
  variantId?: string | null,
): ProductDetailSeo {
  const variant = resolveInitialVariant(
    detail.variants,
    variantId,
    detail.defaultVariantId,
  );
  const title = detail.product.name.trim() || "Producto";
  const description = truncateDescription(detail.product.description);
  const canonicalUrl = buildProductDetailCanonicalUrl(detail.product.id, variant?.id ?? variantId);
  const imageUrl = pickOgImageUrl(detail, variantId);

  return { title, description, canonicalUrl, imageUrl };
}

export function productDetailMetadata(seo: ProductDetailSeo): Metadata {
  const images = seo.imageUrl
    ? [
        {
          url: seo.imageUrl,
          width: 1200,
          height: 630,
          alt: seo.title,
        },
      ]
    : undefined;

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: seo.canonicalUrl,
    },
    openGraph: {
      type: "website",
      url: seo.canonicalUrl,
      title: seo.title,
      description: seo.description,
      siteName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "KaiStore eShop",
      locale: "es_CL",
      images,
    },
    twitter: {
      card: seo.imageUrl ? "summary_large_image" : "summary",
      title: seo.title,
      description: seo.description,
      images: seo.imageUrl ? [seo.imageUrl] : undefined,
    },
  };
}
