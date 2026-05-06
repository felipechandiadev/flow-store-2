"use server";

import { ProductsPosRequest } from "../infrastructure/products-pos.request";

export async function searchPosProductsAction(input: {
  query?: string;
  priceListId: string;
  branchId?: string | null;
  page: number;
  pageSize: number;
}) {
  return ProductsPosRequest.search(input);
}
