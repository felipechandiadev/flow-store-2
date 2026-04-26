import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { ProductGridRow, ProductPriceListItemRow, ProductVariantGridRow } from "../types/product-grid.types";

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

function normalizeVariant(v: unknown): ProductVariantGridRow | null {
  if (!v || typeof v !== "object") {
    return null;
  }
  const o = v as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const sku = o.sku != null ? String(o.sku) : "";
  if (!id) {
    return null;
  }
  const plRaw = o.priceListItems;
  const priceListItems: ProductPriceListItemRow[] = Array.isArray(plRaw)
    ? plRaw
        .map((item): ProductPriceListItemRow | null => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const p = item as Record<string, unknown>;
          const priceListId = p.priceListId != null ? String(p.priceListId) : "";
          const priceListName = p.priceListName != null ? String(p.priceListName) : "";
          const currency = p.currency != null ? String(p.currency) : "CLP";
          const net = typeof p.netPrice === "number" ? p.netPrice : Number(p.netPrice) || 0;
          const gross = typeof p.grossPrice === "number" ? p.grossPrice : Number(p.grossPrice) || 0;
          if (!priceListId) {
            return null;
          }
          return {
            priceListId,
            priceListName,
            currency,
            netPrice: net,
            grossPrice: gross,
            taxIds: Array.isArray(p.taxIds) ? p.taxIds.map(String) : undefined,
          };
        })
        .filter((x): x is ProductPriceListItemRow => x != null)
    : [];
  return {
    id,
    sku: sku || "—",
    barcode: o.barcode != null && String(o.barcode).trim() ? String(o.barcode) : null,
    unitOfMeasure: o.unitOfMeasure != null ? String(o.unitOfMeasure) : null,
    isActive: o.isActive !== false,
    basePrice: typeof o.basePrice === "number" ? o.basePrice : o.basePrice != null ? Number(o.basePrice) : undefined,
    baseCost: typeof o.baseCost === "number" ? o.baseCost : o.baseCost != null ? Number(o.baseCost) : undefined,
    priceListItems,
  };
}

function normalizeProduct(row: unknown): ProductGridRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const name = o.name != null ? String(o.name) : "";
  if (!id || !name) {
    return null;
  }
  const variantsRaw = o.variants;
  const variants = Array.isArray(variantsRaw)
    ? variantsRaw.map(normalizeVariant).filter((x): x is ProductVariantGridRow => x != null)
    : [];
  const variantCount =
    typeof o.variantCount === "number" && Number.isFinite(o.variantCount)
      ? o.variantCount
      : variants.length;

  return {
    id,
    name,
    brand: o.brand != null && String(o.brand).trim() ? String(o.brand).trim() : null,
    description: o.description != null && String(o.description).trim() ? String(o.description).trim() : null,
    isActive: o.isActive !== false,
    variantCount,
    variants,
  };
}

export class ProductRequest {
  /**
   * Lista productos con variantes (search del backend; sin paginación server-side real).
   * `pageSize` alto para armar paginación en el servidor de la página.
   */
  /** pageSize máx. 50 por validación del DTO en `GET /products`. */
  static async searchProducts(query: string, pageSize = 50): Promise<ProductGridRow[]> {
    const headers = await authHeaders();
    const q = new URLSearchParams();
    if (query.trim()) {
      q.set("query", query.trim());
    }
    q.set("pageSize", String(Math.min(50, Math.max(1, pageSize))));
    q.set("page", "1");
    try {
      const res = await fetch(apiUrl(`products?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return [];
      }
      const json = (await res.json()) as unknown;
      if (!Array.isArray(json)) {
        return [];
      }
      return json.map(normalizeProduct).filter((x): x is ProductGridRow => x != null);
    } catch {
      return [];
    }
  }

  static async create(body: {
    name: string;
    brand?: string;
    description?: string;
    isActive?: boolean;
  }): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      name: body.name.trim(),
      isActive: body.isActive !== false,
    };
    if (body.brand?.trim()) {
      payload.brand = body.brand.trim();
    }
    if (body.description?.trim()) {
      payload.description = body.description.trim();
    }
    try {
      const res = await fetch(apiUrl("products"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      const id = data.id != null ? String(data.id) : "";
      if (!id) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, id };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear producto";
      return { success: false, error: err };
    }
  }

  static async createVariant(body: {
    productId: string;
    sku: string;
    barcode?: string | null;
    basePrice: number;
    unitId: string;
    isActive?: boolean;
  }): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      productId: body.productId,
      sku: body.sku.trim(),
      basePrice: Number.isFinite(body.basePrice) ? body.basePrice : 0,
      unitId: body.unitId,
      isActive: body.isActive !== false,
    };
    if (body.barcode?.trim()) {
      payload.barcode = body.barcode.trim();
    }
    try {
      const res = await fetch(apiUrl("product-variants"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      if (data.success === false) {
        const err = typeof data.error === "string" && data.error.trim() ? data.error.trim() : "Error al crear variante";
        return { success: false, error: err };
      }
      const variant = data.variant as Record<string, unknown> | undefined;
      const id =
        variant?.id != null
          ? String(variant.id)
          : data.id != null
            ? String(data.id)
            : "";
      if (!id) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, id };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear variante";
      return { success: false, error: err };
    }
  }
}
