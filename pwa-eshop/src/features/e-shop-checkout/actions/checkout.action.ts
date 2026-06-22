"use server";

import { getEShopStoreSlug } from "@/lib/eshop-store-config";
import { EShopRequest } from "@/features/e-shop-storefront/infrastructure/eshop.request";
import type { EShopFulfillmentMethodPublic } from "../types/checkout.types";

export async function fetchFulfillmentMethodsAction(subtotal: number) {
  return EShopRequest.get<EShopFulfillmentMethodPublic[]>(
    getEShopStoreSlug(),
    `/e-shop/fulfillment-methods?subtotal=${encodeURIComponent(String(subtotal))}`,
  );
}

export async function submitCheckoutAction(body: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  fulfillmentMethodId: string;
  address?: string;
  shippingAddress?: {
    line1?: string;
    commune?: string;
    region?: string;
    notes?: string;
  };
  lines: Array<{ productVariantId: string; quantity: number }>;
  notes?: string;
}) {
  return EShopRequest.post<{
    transactionId: string;
    documentNumber: string;
    total: number;
    fulfillmentStatus?: string;
    hasStockShortage?: boolean;
  }>(getEShopStoreSlug(), "/e-shop/checkout", body);
}
