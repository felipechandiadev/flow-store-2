import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PurchasingVariantSearchResult } from "../types/purchasing-document.types";

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
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}

function normalizeItem(row: unknown): PurchasingVariantSearchResult["items"][number] | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) {
    return null;
  }
  const avRaw = o.attributeValues;
  const attributeValues: Record<string, string> =
    avRaw != null && typeof avRaw === "object" && !Array.isArray(avRaw)
      ? Object.fromEntries(
          Object.entries(avRaw as Record<string, unknown>)
            .map(([k, v]) => [String(k), v == null ? "" : String(v)])
            .filter(([, v]) => v.trim() !== ""),
        )
      : {};
  const taxRaw = o.defaultTaxIds;
  const defaultTaxIds = Array.isArray(taxRaw) ? taxRaw.map((x) => String(x)) : [];
  return {
    id,
    productId: o.productId != null ? String(o.productId) : "",
    productName: o.productName != null ? String(o.productName) : "",
    categoryName:
      o.categoryName != null && String(o.categoryName).trim() ? String(o.categoryName).trim() : null,
    sku: o.sku != null ? String(o.sku) : "",
    barcode: o.barcode != null && String(o.barcode).trim() ? String(o.barcode).trim() : null,
    pmp: typeof o.pmp === "number" && Number.isFinite(o.pmp) ? o.pmp : Number(o.pmp) || 0,
    attributeValues,
    unitLabel: o.unitLabel != null && String(o.unitLabel).trim() ? String(o.unitLabel).trim() : null,
    defaultTaxIds,
  };
}

export class PurchasingVariantSearchRequest {
  static async search(params: {
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PurchasingVariantSearchResult> {
    const headers = await authHeaders();
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
    const q = new URLSearchParams();
    const trimmed = params.q?.trim();
    if (trimmed) {
      q.set("q", trimmed);
    }
    q.set("page", String(page));
    q.set("pageSize", String(pageSize));
    try {
      const res = await fetch(apiUrl(`product-variants/purchasing-search?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { items: [], page: 1, pageSize, total: 0 };
      }
      const json = (await res.json()) as unknown;
      if (!json || typeof json !== "object") {
        return { items: [], page: 1, pageSize, total: 0 };
      }
      const body = json as Record<string, unknown>;
      const itemsRaw = body.items;
      const items = Array.isArray(itemsRaw)
        ? itemsRaw.map(normalizeItem).filter((x): x is NonNullable<typeof x> => x != null)
        : [];
      const total =
        typeof body.total === "number" && Number.isFinite(body.total) ? Math.max(0, body.total) : items.length;
      const p = typeof body.page === "number" && Number.isFinite(body.page) ? body.page : page;
      const ps =
        typeof body.pageSize === "number" && Number.isFinite(body.pageSize) ? body.pageSize : pageSize;
      return { items, page: p, pageSize: ps, total };
    } catch {
      return { items: [], page: 1, pageSize, total: 0 };
    }
  }
}
