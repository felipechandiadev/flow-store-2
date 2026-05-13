"use server";

import { ProductsPosRequest } from "../infrastructure/products-pos.request";

export async function searchPosProductsAction(input: {
  query?: string;
  priceListId: string;
  branchId?: string | null;
  pointOfSaleId?: string | null;
  page: number;
  pageSize: number;
}) {
  return ProductsPosRequest.search(input);
}

export async function getPosVariantStockAction(input: { variantId: string; pointOfSaleId: string }) {
  return ProductsPosRequest.getVariantStock(input);
}
