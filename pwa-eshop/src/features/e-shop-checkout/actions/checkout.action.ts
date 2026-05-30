"use server";

import { getEShopStoreSlug } from "@/lib/eshop-store-config";
import { EShopRequest } from "@/features/e-shop-storefront/infrastructure/eshop.request";

export async function submitCheckoutAction(body: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  address?: string;
  lines: Array<{ productVariantId: string; quantity: number }>;
  notes?: string;
}) {
  return EShopRequest.post<{
    transactionId: string;
    documentNumber: string;
    total: number;
  }>(getEShopStoreSlug(), "/e-shop/checkout", body);
}
