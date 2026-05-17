import { apiUrl, authHeaders } from "@/lib/auth/auth-headers";
import type { StorageOption, StockStorageBreakdown, VariantStockRow } from "../types/stock.types";

function parseBreakdown(raw: unknown): StockStorageBreakdown[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const o = x as Record<string, unknown>;
      const storageId = o.storageId != null ? String(o.storageId) : "";
      if (!storageId) return null;
      return {
        storageId,
        storageName: o.storageName != null ? String(o.storageName) : "",
        branchName:
          o.branchName != null && String(o.branchName).trim() ? String(o.branchName) : null,
        quantity:
          typeof o.quantity === "number" && Number.isFinite(o.quantity)
            ? o.quantity
            : Number(o.quantity) || 0,
        availableStock:
          typeof o.availableStock === "number" && Number.isFinite(o.availableStock)
            ? o.availableStock
            : Number(o.availableStock) || 0,
        committedStock:
          typeof o.committedStock === "number" && Number.isFinite(o.committedStock)
            ? o.committedStock
            : Number(o.committedStock) || 0,
        stockLevelId:
          o.stockLevelId === undefined
            ? undefined
            : o.stockLevelId === null
              ? null
              : String(o.stockLevelId),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null) as StockStorageBreakdown[];
}

export class StockRequest {
  static async getVariantStock(
    variantId: string,
    sku?: string,
  ): Promise<{ success: true; row: VariantStockRow } | { success: false; error: string }> {
    const headers = await authHeaders();
    const q = new URLSearchParams();
    if (sku?.trim()) q.set("search", sku.trim());
    q.set("limit", "500");
    q.set("page", "1");
    try {
      const res = await fetch(apiUrl(`inventory?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          typeof json.message === "string" && json.message.trim()
            ? json.message.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      const rowsRaw = json.rows;
      const rows = Array.isArray(rowsRaw) ? rowsRaw : [];
      const match = rows.find((r) => {
        if (!r || typeof r !== "object") return false;
        const o = r as Record<string, unknown>;
        const vid = o.variantId != null ? String(o.variantId) : o.id != null ? String(o.id) : "";
        return vid === variantId;
      }) as Record<string, unknown> | undefined;
      if (!match) {
        return { success: false, error: "Sin datos de stock para esta variante" };
      }
      return {
        success: true,
        row: {
          variantId,
          productName: match.productName != null ? String(match.productName) : "",
          sku: match.sku != null ? String(match.sku) : "",
          stockUnitSymbol: match.stockUnitSymbol != null ? String(match.stockUnitSymbol) : "",
          storageBreakdown: parseBreakdown(match.storageBreakdown),
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar stock",
      };
    }
  }

  static async listStorages(): Promise<
    { success: true; storages: StorageOption[] } | { success: false; error: string }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("inventory/filters"), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return { success: false, error: res.statusText };
      }
      const storagesRaw = data.storages;
      const storages = Array.isArray(storagesRaw)
        ? storagesRaw
            .map((s) => {
              if (!s || typeof s !== "object") return null;
              const o = s as Record<string, unknown>;
              const id = o.id != null ? String(o.id) : "";
              if (!id) return null;
              const branch = o.branch as Record<string, unknown> | undefined;
              const branchName =
                branch?.name != null && String(branch.name).trim()
                  ? String(branch.name)
                  : null;
              return {
                id,
                name: o.name != null ? String(o.name) : "",
                branchName,
              } satisfies StorageOption;
            })
            .filter((x): x is StorageOption => x != null)
        : [];
      return { success: true, storages };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar almacenes",
      };
    }
  }

  static async adjust(body: {
    variantId: string;
    storageId: string;
    currentQuantity: number;
    targetQuantity: number;
    note?: string;
  }): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("inventory/adjust"), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          typeof data.message === "string" && data.message.trim()
            ? data.message.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al ajustar stock",
      };
    }
  }

  static async transfer(body: {
    variantId: string;
    sourceStorageId: string;
    targetStorageId: string;
    quantity: number;
    note?: string;
  }): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("inventory/transfer"), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          typeof data.message === "string" && data.message.trim()
            ? data.message.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al transferir stock",
      };
    }
  }
}
