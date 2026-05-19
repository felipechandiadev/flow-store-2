"use server";

import { revalidatePath } from "next/cache";
import { updateProductVariantInventoryPartialAction } from "@/features/inventory-products/actions/product.action";
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
  const currentQuantity = Math.max(0, Number(input.currentQuantity) || 0);
  const targetQuantity = Math.max(0, Number(input.targetQuantity) || 0);
  const r = await InventoryRequest.adjust({
    variantId: input.variantId.trim(),
    storageId: input.storageId.trim(),
    currentQuantity,
    targetQuantity,
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

export async function saveVariantStockConfigAction(input: {
  variantId: string;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  storageThresholds: Array<{
    storageId: string;
    minimumStock: number | null;
    maximumStock: number | null;
    reorderPoint: number | null;
  }>;
}): Promise<{ success: true } | { success: false; error: string }> {
  const variantId = input.variantId.trim();
  if (!variantId) {
    return { success: false, error: "Variante no válida" };
  }

  const inv = await updateProductVariantInventoryPartialAction(variantId, {
    trackInventory: input.trackInventory,
    allowNegativeStock: input.allowNegativeStock,
    minimumStock: input.minimumStock,
    maximumStock: input.maximumStock,
    reorderPoint: input.reorderPoint,
  });
  if (!inv.success) {
    return inv;
  }

  for (const st of input.storageThresholds) {
    const r = await InventoryRequest.updateStockLevelThresholds({
      productVariantId: variantId,
      storageId: st.storageId.trim(),
      minimumStock: st.minimumStock,
      maximumStock: st.maximumStock,
      reorderPoint: st.reorderPoint,
    });
    if (!r.success) {
      return r;
    }
  }

  revalidateStockRoute();
  return { success: true };
}
