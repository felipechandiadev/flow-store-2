"use server";

import { PointOfSaleRequest } from "../infrastructure/point-of-sale.request";
import type { PosPriceListSnapshot } from "../lib/pos-context-storage";

function normalizePriceLists(raw: unknown): PosPriceListSnapshot[] {
  if (!Array.isArray(raw)) return [];
  const out: PosPriceListSnapshot[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = o.id != null ? String(o.id).trim() : "";
    const name = o.name != null ? String(o.name).trim() : "";
    if (!id) continue;
    if (o.isActive === false) continue;
    out.push({ id, name: name || "Lista de precios" });
  }
  return out;
}

export async function fetchPointOfSalePriceListsAction(pointOfSaleId: string): Promise<
  | {
      success: true;
      priceLists: PosPriceListSnapshot[];
      defaultPriceListId: string | null;
    }
  | { success: false; message: string; priceLists: [] }
> {
  const id = pointOfSaleId?.trim();
  if (!id) {
    return { success: false, message: "Sin punto de venta en contexto", priceLists: [] };
  }

  const res = await PointOfSaleRequest.findById(id);
  if (!res.success) {
    return { success: false, message: res.error, priceLists: [] };
  }

  const priceLists = normalizePriceLists(res.pointOfSale.priceLists);
  const defaultPriceListId =
    res.pointOfSale.defaultPriceListId != null
      ? String(res.pointOfSale.defaultPriceListId).trim() || null
      : null;

  return { success: true, priceLists, defaultPriceListId };
}
