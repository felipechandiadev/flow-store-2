import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { StockGridRow } from "../types/stock-grid.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

function parseAttributeValues(raw: unknown): Record<string, string> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const val = v == null ? "" : String(v).trim();
    if (val) {
      out[String(k).trim()] = val;
    }
  }
  return out;
}

function normalizeStorageBreakdown(raw: unknown): StockGridRow["storageBreakdown"] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((x) => {
      if (!x || typeof x !== "object") {
        return null;
      }
      const o = x as Record<string, unknown>;
      const storageId = o.storageId != null ? String(o.storageId) : "";
      if (!storageId) {
        return null;
      }
      return {
        storageId,
        storageName: o.storageName != null ? String(o.storageName) : "",
        branchName:
          o.branchName != null && String(o.branchName).trim() ? String(o.branchName).trim() : null,
        quantity: typeof o.quantity === "number" && Number.isFinite(o.quantity) ? o.quantity : Number(o.quantity) || 0,
        reservedStock: (() => {
          if (typeof o.reservedStock === "number" && Number.isFinite(o.reservedStock)) {
            return o.reservedStock;
          }
          if (typeof o.committedStock === "number" && Number.isFinite(o.committedStock)) {
            return o.committedStock;
          }
          return Number(o.reservedStock ?? o.committedStock) || 0;
        })(),
        availableStock: (() => {
          const physical =
            typeof o.quantity === "number" && Number.isFinite(o.quantity)
              ? o.quantity
              : Number(o.quantity) || 0;
          const reserved =
            typeof o.reservedStock === "number" && Number.isFinite(o.reservedStock)
              ? o.reservedStock
              : typeof o.committedStock === "number" && Number.isFinite(o.committedStock)
                ? o.committedStock
                : Number(o.reservedStock ?? o.committedStock) || 0;
          if (typeof o.availableStock === "number" && Number.isFinite(o.availableStock)) {
            return o.availableStock;
          }
          if (
            typeof o.availableAfterReservation === "number" &&
            Number.isFinite(o.availableAfterReservation)
          ) {
            return o.availableAfterReservation;
          }
          return physical - reserved;
        })(),
        committedStock:
          typeof o.committedStock === "number" && Number.isFinite(o.committedStock)
            ? o.committedStock
            : typeof o.reservedStock === "number" && Number.isFinite(o.reservedStock)
              ? o.reservedStock
              : Number(o.committedStock ?? o.reservedStock) || 0,
        stockLevelId:
          o.stockLevelId === undefined
            ? undefined
            : o.stockLevelId === null
              ? null
              : String(o.stockLevelId),
        minimumStockOverride:
          o.minimumStockOverride === undefined
            ? undefined
            : o.minimumStockOverride === null
              ? null
              : Number(o.minimumStockOverride),
        maximumStockOverride:
          o.maximumStockOverride === undefined
            ? undefined
            : o.maximumStockOverride === null
              ? null
              : Number(o.maximumStockOverride),
        reorderPointOverride:
          o.reorderPointOverride === undefined
            ? undefined
            : o.reorderPointOverride === null
              ? null
              : Number(o.reorderPointOverride),
        effectiveMinimumStock:
          o.effectiveMinimumStock != null ? Number(o.effectiveMinimumStock) : undefined,
        effectiveMaximumStock:
          o.effectiveMaximumStock != null ? Number(o.effectiveMaximumStock) : undefined,
        effectiveReorderPoint:
          o.effectiveReorderPoint != null ? Number(o.effectiveReorderPoint) : undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

function normalizeMovement(raw: unknown): StockGridRow["movements"][number] | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const m = raw as Record<string, unknown>;
  const transactionId = m.transactionId != null ? String(m.transactionId) : "";
  if (!transactionId) {
    return null;
  }
  const dir = m.direction === "OUT" ? "OUT" : "IN";
  return {
    transactionId,
    documentNumber: m.documentNumber != null ? String(m.documentNumber) : "",
    transactionType: m.transactionType != null ? String(m.transactionType) : "",
    createdAt: m.createdAt != null ? String(m.createdAt) : "",
    quantity: typeof m.quantity === "number" && Number.isFinite(m.quantity) ? m.quantity : Number(m.quantity) || 0,
    notes: m.notes != null ? String(m.notes) : null,
    storageName: m.storageName != null ? String(m.storageName) : null,
    targetStorageName: m.targetStorageName != null ? String(m.targetStorageName) : null,
    direction: dir,
  };
}

function normalizeRow(row: unknown): StockGridRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const variantId = o.variantId != null ? String(o.variantId) : o.id != null ? String(o.id) : "";
  if (!variantId) {
    return null;
  }
  const movementsRaw = o.movements;
  const movements = Array.isArray(movementsRaw)
    ? movementsRaw.map(normalizeMovement).filter((x): x is NonNullable<typeof x> => x != null)
    : [];
  return {
    id: o.id != null ? String(o.id) : variantId,
    variantId,
    productId: o.productId != null ? String(o.productId) : null,
    productName: o.productName != null ? String(o.productName) : "",
    sku: o.sku != null ? String(o.sku) : "",
    unitOfMeasure: o.unitOfMeasure != null ? String(o.unitOfMeasure) : "",
    saleUnitOfMeasure: o.saleUnitOfMeasure != null ? String(o.saleUnitOfMeasure) : "",
    stockUnitSymbol: o.stockUnitSymbol != null ? String(o.stockUnitSymbol) : "",
    saleUnitSymbol: o.saleUnitSymbol != null ? String(o.saleUnitSymbol) : "",
    stockBaseQtyPerCountSaleUnit: (() => {
      const raw = o.stockBaseQtyPerCountSaleUnit;
      if (raw == null || raw === "") {
        return null;
      }
      const n = typeof raw === "number" && Number.isFinite(raw) ? raw : Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    })(),
    attributeValues: parseAttributeValues(o.attributeValues),
    totalStock:
      typeof o.totalStock === "number" && Number.isFinite(o.totalStock) ? o.totalStock : Number(o.totalStock) || 0,
    availableStock:
      typeof o.availableStock === "number" && Number.isFinite(o.availableStock)
        ? o.availableStock
        : Number(o.availableStock) || 0,
    inventoryValueCost:
      typeof o.inventoryValueCost === "number" && Number.isFinite(o.inventoryValueCost)
        ? o.inventoryValueCost
        : Number(o.inventoryValueCost) || 0,
    pmp: typeof o.pmp === "number" && Number.isFinite(o.pmp) ? o.pmp : Number(o.pmp) || 0,
    pmpValue: typeof o.pmpValue === "number" && Number.isFinite(o.pmpValue) ? o.pmpValue : Number(o.pmpValue) || 0,
    isBelowMinimum: o.isBelowMinimum === true,
    primaryStorageName: o.primaryStorageName != null ? String(o.primaryStorageName) : "",
    primaryStorageQuantity:
      typeof o.primaryStorageQuantity === "number" && Number.isFinite(o.primaryStorageQuantity)
        ? o.primaryStorageQuantity
        : Number(o.primaryStorageQuantity) || 0,
    storageBreakdown: normalizeStorageBreakdown(o.storageBreakdown),
    movements,
  };
}

export class InventoryRequest {
  static async search(params: {
    search?: string;
    storageId?: string;
    branchId?: string;
    page?: number;
    limit?: number;
    sortField?: string;
    sort?: "asc" | "desc";
  }): Promise<{ rows: StockGridRow[]; total: number }> {
    const headers = await authHeaders();
    const q = new URLSearchParams();
    if (params.search?.trim()) {
      q.set("search", params.search.trim());
    }
    if (params.storageId?.trim()) {
      q.set("storageId", params.storageId.trim());
    }
    if (params.branchId?.trim()) {
      q.set("branchId", params.branchId.trim());
    }
    q.set("page", String(Math.max(1, params.page ?? 1)));
    q.set("limit", String(Math.min(500, Math.max(1, params.limit ?? 25))));
    if (params.sortField?.trim()) {
      q.set("sortField", params.sortField.trim());
    }
    if (params.sort === "desc") {
      q.set("sort", "desc");
    }
    try {
      const res = await fetch(apiUrl(`inventory?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { rows: [], total: 0 };
      }
      const json = (await res.json()) as unknown;
      if (!json || typeof json !== "object") {
        return { rows: [], total: 0 };
      }
      const body = json as Record<string, unknown>;
      const rowsRaw = body.rows;
      const rows = Array.isArray(rowsRaw)
        ? rowsRaw.map(normalizeRow).filter((x): x is StockGridRow => x != null)
        : [];
      const total =
        typeof body.total === "number" && Number.isFinite(body.total) ? Math.max(0, body.total) : rows.length;
      return { rows, total };
    } catch {
      return { rows: [], total: 0 };
    }
  }

  static async adjust(body: {
    variantId: string;
    storageId: string;
    currentQuantity: number;
    targetQuantity: number;
    note?: string;
  }): Promise<{ success: true; message?: string } | { success: false; error: string }> {
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
      return { success: true, message: typeof data.message === "string" ? data.message : undefined };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al ajustar stock";
      return { success: false, error: err };
    }
  }

  static async transfer(body: {
    variantId: string;
    sourceStorageId: string;
    targetStorageId: string;
    quantity: number;
    note?: string;
  }): Promise<{ success: true; message?: string } | { success: false; error: string }> {
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
            : typeof (data as { error?: string }).error === "string"
              ? String((data as { error?: string }).error)
              : res.statusText;
        return { success: false, error: msg };
      }
      return { success: true, message: typeof data.message === "string" ? data.message : undefined };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al transferir stock";
      return { success: false, error: err };
    }
  }

  static async updateStockLevelThresholds(body: {
    productVariantId: string;
    storageId: string;
    minimumStock?: number | null;
    maximumStock?: number | null;
    reorderPoint?: number | null;
  }): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("inventory/stock-levels/thresholds"), {
        method: "PATCH",
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
      const err = e instanceof Error ? e.message : "Error al guardar umbrales";
      return { success: false, error: err };
    }
  }
}
