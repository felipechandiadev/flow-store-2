"use server";

import { revalidatePath } from "next/cache";
import { InventoryRequest } from "../infrastructure/inventory.request";
import type { ListStockForGridInput, ListStockForGridResult } from "../types/stock-grid.types";

const STOCK_PATH = "/inventory/stock";

function revalidateStockRoute() {
  revalidatePath(STOCK_PATH, "page");
  // Invalida layouts del segmento para que `router.refresh()` reciba RSC nuevo (no solo caché de página aislada).
  revalidatePath(STOCK_PATH, "layout");
}

export async function listStockForGrid(input: ListStockForGridInput): Promise<ListStockForGridResult> {
  const page = Math.max(1, input.page);
  const limit = Math.min(500, Math.max(1, input.limit));
  const sortField = input.sortField?.trim() || "productName";
  const sort = input.sort === "desc" ? "desc" : "asc";
  const r = await InventoryRequest.search({
    search: input.search?.trim(),
    storageId: input.storageId?.trim() || undefined,
    branchId: input.branchId?.trim() || undefined,
    page,
    limit,
    sortField,
    sort,
  });
  return { rows: r.rows, total: r.total, page, limit };
}

export async function adjustStockAction(input: {
  variantId: string;
  storageId: string;
  currentQuantity: number;
  targetQuantity: number;
  note?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const r = await InventoryRequest.adjust({
    variantId: input.variantId.trim(),
    storageId: input.storageId.trim(),
    currentQuantity: input.currentQuantity,
    targetQuantity: input.targetQuantity,
    note: input.note?.trim() || undefined,
  });
  if (r.success) {
    revalidateStockRoute();
  }
  return r;
}

export async function transferStockAction(input: {
  variantId: string;
  sourceStorageId: string;
  targetStorageId: string;
  quantity: number;
  note?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const r = await InventoryRequest.transfer({
    variantId: input.variantId.trim(),
    sourceStorageId: input.sourceStorageId.trim(),
    targetStorageId: input.targetStorageId.trim(),
    quantity: input.quantity,
    note: input.note?.trim() || undefined,
  });
  if (r.success) {
    revalidateStockRoute();
  }
  return r;
}
