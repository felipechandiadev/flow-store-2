import { apiUrl, authHeaders } from "@/lib/auth/auth-headers";
import type { VariantDetail, VariantLookupItem } from "../types/variant.types";

function parseAttributeValues(raw: unknown): Record<string, string> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const val = v == null ? "" : String(v).trim();
    if (val) out[String(k).trim()] = val;
  }
  return out;
}

function mapLookupItem(data: Record<string, unknown>): VariantLookupItem | null {
  const variantId = data.variantId != null ? String(data.variantId) : "";
  if (!variantId) return null;
  return {
    variantId,
    sku: data.sku != null ? String(data.sku) : "",
    barcode: data.barcode != null && String(data.barcode).trim() ? String(data.barcode) : null,
    productName: data.productName != null ? String(data.productName) : "",
    attributeValues: parseAttributeValues(data.attributeValues),
  };
}

export class VariantRequest {
  static async lookupByCode(
    code: string,
    mode: "barcode" | "sku",
  ): Promise<
    | { success: true; items: VariantLookupItem[] }
    | { success: false; error: string }
  > {
    const headers = await authHeaders();
    const q = new URLSearchParams({ value: code.trim(), by: mode });
    try {
      const res = await fetch(apiUrl(`product-variants/scan/by-code?${q}`), {
        method: "GET",
        headers,
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
      if (data.variantId) {
        const one = mapLookupItem(data);
        return { success: true, items: one ? [one] : [] };
      }
      const itemsRaw = data.items;
      const items = Array.isArray(itemsRaw)
        ? itemsRaw
            .map((x) =>
              x && typeof x === "object" ? mapLookupItem(x as Record<string, unknown>) : null,
            )
            .filter((x): x is VariantLookupItem => x != null)
        : [];
      return { success: true, items };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al buscar variante",
      };
    }
  }

  static async getById(
    variantId: string,
  ): Promise<{ success: true; variant: VariantDetail } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`product-variants/${variantId}`), {
        method: "GET",
        headers,
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
      const product = data.product as Record<string, unknown> | undefined;
      return {
        success: true,
        variant: {
          variantId: String(data.id ?? variantId),
          productId: data.productId != null ? String(data.productId) : null,
          sku: data.sku != null ? String(data.sku) : "",
          barcode:
            data.barcode != null && String(data.barcode).trim() ? String(data.barcode) : null,
          productName: product?.name != null ? String(product.name) : "",
          attributeValues: parseAttributeValues(data.attributeValues),
          unitOfMeasure: (() => {
            const u = data.stockBaseUnit ?? data.unit;
            if (!u || typeof u !== "object") return "";
            const o = u as Record<string, unknown>;
            return String(o.symbol || o.name || "").trim();
          })(),
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar variante",
      };
    }
  }

  static async updateBarcode(
    variantId: string,
    barcode: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`product-variants/${variantId}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({ barcode }),
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
        error: e instanceof Error ? e.message : "Error al actualizar código",
      };
    }
  }
}
