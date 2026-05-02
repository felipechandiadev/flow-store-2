import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  ProductGridRow,
  ProductPriceListItemRow,
  ProductVariantGridRow,
  ProductVariantMediaAsset,
} from "../types/product-grid.types";
import { resolveMultimediaPublicUrl } from "@/features/multimedia/utils/resolve-multimedia-public-url";

function parseAttributeValuesRecord(raw: unknown): Record<string, string> | undefined {
  if (raw == null) {
    return undefined;
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (typeof p === "object" && p != null && !Array.isArray(p)) {
        return parseAttributeValuesRecord(p);
      }
    } catch {
      return undefined;
    }
    return undefined;
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const val = v == null ? "" : String(v).trim();
      if (val) {
        out[String(k).trim()] = val;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return undefined;
}

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
  const mediaRaw = o.mediaAssets;
  const mediaAssets: ProductVariantMediaAsset[] | undefined = Array.isArray(mediaRaw)
    ? mediaRaw
        .map((m): ProductVariantMediaAsset | null => {
          if (!m || typeof m !== "object") {
            return null;
          }
          const x = m as Record<string, unknown>;
          const mid = x.id != null ? String(x.id) : "";
          const url = x.publicUrl != null ? String(x.publicUrl) : "";
          if (!mid || !url) {
            return null;
          }
          return {
            id: mid,
            publicUrl: resolveMultimediaPublicUrl(url),
            mimeType: x.mimeType != null ? String(x.mimeType) : "",
            kind: x.kind != null ? String(x.kind) : "",
          };
        })
        .filter((x): x is ProductVariantMediaAsset => x != null)
    : undefined;
  const w =
    o.weight != null && o.weight !== ""
      ? typeof o.weight === "number"
        ? o.weight
        : Number(o.weight)
      : null;
  const weightNum = w != null && Number.isFinite(w) ? w : null;

  return {
    id,
    sku: sku || "—",
    productId: o.productId != null ? String(o.productId) : undefined,
    unitId: o.unitId != null ? String(o.unitId) : undefined,
    barcode: o.barcode != null && String(o.barcode).trim() ? String(o.barcode) : null,
    unitOfMeasure: o.unitOfMeasure != null ? String(o.unitOfMeasure) : null,
    isActive: o.isActive !== false,
    basePrice: typeof o.basePrice === "number" ? o.basePrice : o.basePrice != null ? Number(o.basePrice) : undefined,
    baseCost: typeof o.baseCost === "number" ? o.baseCost : o.baseCost != null ? Number(o.baseCost) : undefined,
    pmp: typeof o.pmp === "number" ? o.pmp : o.pmp != null ? Number(o.pmp) : undefined,
    displayName:
      o.displayName != null && String(o.displayName).trim() ? String(o.displayName).trim() : null,
    attributeValues: parseAttributeValuesRecord(o.attributeValues),
    trackInventory: typeof o.trackInventory === "boolean" ? o.trackInventory : undefined,
    allowNegativeStock: typeof o.allowNegativeStock === "boolean" ? o.allowNegativeStock : undefined,
    weight: weightNum,
    weightUnit: o.weightUnit != null ? String(o.weightUnit) : undefined,
    primaryImageUrl:
      o.primaryImageUrl != null && String(o.primaryImageUrl).trim()
        ? resolveMultimediaPublicUrl(String(o.primaryImageUrl).trim())
        : null,
    mediaAssets: mediaAssets && mediaAssets.length > 0 ? mediaAssets : undefined,
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

  const categoryIdRaw = o.categoryId;
  const categoryId =
    categoryIdRaw != null && String(categoryIdRaw).trim() ? String(categoryIdRaw).trim() : null;
  const categoryNameRaw = o.categoryName;
  const categoryName =
    categoryNameRaw != null && String(categoryNameRaw).trim() ? String(categoryNameRaw).trim() : null;

  return {
    id,
    name,
    productType: o.productType != null && String(o.productType).trim() ? String(o.productType).trim() : null,
    brand: o.brand != null && String(o.brand).trim() ? String(o.brand).trim() : null,
    description: o.description != null && String(o.description).trim() ? String(o.description).trim() : null,
    categoryId,
    categoryName,
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
    categoryId?: string;
    brand?: string;
    description?: string;
    productType?: string;
    metadata?: Record<string, unknown>;
    isActive?: boolean;
  }): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      name: body.name.trim(),
      isActive: body.isActive !== false,
    };
    if (body.categoryId?.trim()) {
      payload.categoryId = body.categoryId.trim();
    }
    if (body.brand?.trim()) {
      payload.brand = body.brand.trim();
    }
    if (body.description?.trim()) {
      payload.description = body.description.trim();
    }
    if (body.productType?.trim()) {
      payload.productType = body.productType.trim();
    }
    if (body.metadata && typeof body.metadata === "object") {
      payload.metadata = body.metadata;
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

  static async update(
    id: string,
    body: {
      name: string;
      categoryId?: string;
      brand?: string;
      description?: string;
      productType?: string;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    },
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      name: body.name.trim(),
      isActive: body.isActive !== false,
    };
    if (body.categoryId?.trim()) {
      payload.categoryId = body.categoryId.trim();
    }
    if (body.brand?.trim()) {
      payload.brand = body.brand.trim();
    }
    if (body.description?.trim()) {
      payload.description = body.description.trim();
    }
    if (body.productType?.trim()) {
      payload.productType = body.productType.trim();
    }
    if (body.metadata && typeof body.metadata === "object") {
      payload.metadata = body.metadata;
    }
    try {
      const res = await fetch(apiUrl(`products/${encodeURIComponent(id)}`), {
        method: "PUT",
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
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar producto";
      return { success: false, error: err };
    }
  }

  static async remove(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`products/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar producto";
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
    priceListItems: Array<{
      priceListId: string;
      netPrice: number;
      grossPrice: number;
      taxIds?: string[];
    }>;
    pmp: number;
    attributeValues?: Record<string, string>;
    trackInventory?: boolean;
    allowNegativeStock?: boolean;
    minimumStock?: number;
    maximumStock?: number;
    reorderPoint?: number;
  }): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      productId: body.productId,
      sku: body.sku.trim(),
      basePrice: Number.isFinite(body.basePrice) ? Math.round(body.basePrice) : 0,
      unitId: body.unitId,
      isActive: body.isActive !== false,
      pmp: Math.max(0, Math.round(Number(body.pmp) || 0)),
      priceListItems: body.priceListItems.map((item) => ({
        priceListId: item.priceListId,
        netPrice: Math.round(Number(item.netPrice)) || 0,
        grossPrice: Math.round(Number(item.grossPrice)) || 0,
        taxIds:
          Array.isArray(item.taxIds) && item.taxIds.length > 0 ? item.taxIds : undefined,
      })),
    };
    if (body.barcode?.trim()) {
      payload.barcode = body.barcode.trim();
    }
    if (body.attributeValues != null && Object.keys(body.attributeValues).length > 0) {
      payload.attributeValues = body.attributeValues;
    }
    if (typeof body.trackInventory === "boolean") {
      payload.trackInventory = body.trackInventory;
    }
    if (typeof body.allowNegativeStock === "boolean") {
      payload.allowNegativeStock = body.allowNegativeStock;
    }
    if (body.minimumStock != null) {
      payload.minimumStock = Math.max(0, Math.round(Number(body.minimumStock) || 0));
    }
    if (body.maximumStock != null) {
      payload.maximumStock = Math.max(0, Math.round(Number(body.maximumStock) || 0));
    }
    if (body.reorderPoint != null) {
      payload.reorderPoint = Math.max(0, Math.round(Number(body.reorderPoint) || 0));
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

  static async updateVariant(
    variantId: string,
    body: {
      productId: string;
      sku: string;
      barcode?: string | null;
      basePrice: number;
      unitId: string;
      isActive?: boolean;
      priceListItems: Array<{
        priceListId: string;
        netPrice: number;
        grossPrice: number;
        taxIds?: string[];
      }>;
      pmp: number;
      attributeValues?: Record<string, string>;
      trackInventory?: boolean;
      allowNegativeStock?: boolean;
      minimumStock?: number;
      maximumStock?: number;
      reorderPoint?: number;
    },
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    const id = variantId.trim();
    if (!id) {
      return { success: false, error: "Variante no válida" };
    }
    const payload: Record<string, unknown> = {
      productId: body.productId,
      sku: body.sku.trim(),
      basePrice: Number.isFinite(body.basePrice) ? Math.round(body.basePrice) : 0,
      unitId: body.unitId,
      isActive: body.isActive !== false,
      pmp: Math.max(0, Math.round(Number(body.pmp) || 0)),
      priceListItems: body.priceListItems.map((item) => ({
        priceListId: item.priceListId,
        netPrice: Math.round(Number(item.netPrice)) || 0,
        grossPrice: Math.round(Number(item.grossPrice)) || 0,
        taxIds:
          Array.isArray(item.taxIds) && item.taxIds.length > 0 ? item.taxIds : undefined,
      })),
    };
    if (body.barcode?.trim()) {
      payload.barcode = body.barcode.trim();
    }
    if (body.attributeValues != null && Object.keys(body.attributeValues).length > 0) {
      payload.attributeValues = body.attributeValues;
    }
    if (typeof body.trackInventory === "boolean") {
      payload.trackInventory = body.trackInventory;
    }
    if (typeof body.allowNegativeStock === "boolean") {
      payload.allowNegativeStock = body.allowNegativeStock;
    }
    if (body.minimumStock != null) {
      payload.minimumStock = Math.max(0, Math.round(Number(body.minimumStock) || 0));
    }
    if (body.maximumStock != null) {
      payload.maximumStock = Math.max(0, Math.round(Number(body.maximumStock) || 0));
    }
    if (body.reorderPoint != null) {
      payload.reorderPoint = Math.max(0, Math.round(Number(body.reorderPoint) || 0));
    }
    try {
      const res = await fetch(apiUrl(`product-variants/${encodeURIComponent(id)}`), {
        method: "PUT",
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
        const err =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "Error al actualizar variante";
        return { success: false, error: err };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar variante";
      return { success: false, error: err };
    }
  }

  static async removeVariant(
    variantId: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    const id = variantId.trim();
    if (!id) {
      return { success: false, error: "Variante no válida" };
    }
    try {
      const res = await fetch(apiUrl(`product-variants/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar variante";
      return { success: false, error: err };
    }
  }
}
