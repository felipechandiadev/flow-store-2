"use server";

import { revalidateVariantPaths } from "@/features/variant/lib/revalidate-variant-paths";
import {
  adjustStockUseCase,
  getVariantStockUseCase,
  listStoragesUseCase,
  transferStockUseCase,
} from "../application/stock.usecase";
import { InventoryRequest } from "../infrastructure/inventory-stock.request";
import { StorageListRequest } from "../infrastructure/storage-list.request";
import { mergeStoragesForThresholds } from "../lib/variant-stock-threshold-config";
import type { StockGridRow, StockStorageBreakdownRow } from "../types/stock-grid.types";
import type { StorageListItem } from "../types/storage-list.types";

function revalidateVariant() {
  revalidateVariantPaths();
}

export async function getVariantStockAction(variantId: string, sku?: string) {
  return getVariantStockUseCase(variantId, sku);
}

export async function listStoragesAction() {
  return listStoragesUseCase();
}

export async function adjustStockAction(input: {
  variantId: string;
  storageId: string;
  currentQuantity: number;
  targetQuantity: number;
  note?: string;
}) {
  const r = await adjustStockUseCase(input);
  if (r.success) revalidateVariant();
  return r;
}

export async function transferStockAction(input: {
  variantId: string;
  sourceStorageId: string;
  targetStorageId: string;
  quantity: number;
  note?: string;
}) {
  const r = await transferStockUseCase(input);
  if (r.success) revalidateVariant();
  return r;
}

export type FetchVariantStockBreakdownResult =
  | {
      ok: true;
      breakdown: StockStorageBreakdownRow[];
      stockRow: StockGridRow | null;
      storages: StorageListItem[];
    }
  | { ok: false; error: string };

/** Misma fuente que admin: búsqueda inventario + catálogo de almacenes. */
export async function fetchVariantStockBreakdownAction(input: {
  variantId: string;
  sku: string;
}): Promise<FetchVariantStockBreakdownResult> {
  const variantId = input.variantId?.trim() ?? "";
  const sku = input.sku?.trim() ?? "";
  if (!variantId) {
    return { ok: false, error: "Variante no válida" };
  }
  try {
    const [storagesRes, grid] = await Promise.all([
      StorageListRequest.findAll(true),
      InventoryRequest.search({
        search: sku || undefined,
        page: 1,
        limit: 25,
        sortField: "sku",
        sort: "asc",
      }),
    ]);
    const storages = storagesRes.success ? storagesRes.storages : [];
    const row =
      grid.rows.find((r) => r.variantId === variantId) ??
      (grid.rows.length === 1 ? grid.rows[0] : null);
    const breakdown = mergeStoragesForThresholds(storages, row?.storageBreakdown ?? []);
    return { ok: true, breakdown, stockRow: row, storages };
  } catch (e) {
    const err = e instanceof Error ? e.message : "Error al cargar stock por almacén";
    return { ok: false, error: err };
  }
}
