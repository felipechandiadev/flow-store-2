"use server";

import { revalidatePath } from "next/cache";
import { ProductRequest } from "../infrastructure/product.request";
import type { ProductGridRow } from "../types/product-grid.types";

const PRODUCTS_PATH = "/inventory/products";

export type CreateProductFormInput = {
  name: string;
  brand?: string;
  description?: string;
  isActive?: boolean;
};

export type CreateProductResult = { success: true; id: string } | { success: false; error: string };

export type CreateProductVariantPriceListItemInput = {
  priceListId: string;
  netPrice: number;
  grossPrice: number;
  taxIds?: string[];
};

export type CreateProductVariantFormInput = {
  productId: string;
  sku: string;
  barcode?: string | null;
  basePrice: number;
  unitId: string;
  isActive?: boolean;
  priceListItems: CreateProductVariantPriceListItemInput[];
  /** PMP (precio medio ponderado) guardado en la variante; entero ≥ 0 (omitir → 0). */
  pmp?: number;
  /** Mapa attributeId → texto de opción (catálogo de atributos). Opcional. */
  attributeValues?: Record<string, string>;
};

export type CreateProductVariantResult = { success: true; id: string } | { success: false; error: string };

export type ListProductsForGridInput = {
  query: string;
  page: number;
  limit: number;
  sortField: string;
  sort: "asc" | "desc";
};

export type ListProductsForGridResult = {
  rows: ProductGridRow[];
  total: number;
  page: number;
  limit: number;
};

function compare(a: string | number | boolean | null | undefined, b: string | number | boolean | null | undefined): number {
  if (a == null && b == null) {
    return 0;
  }
  if (a == null) {
    return 1;
  }
  if (b == null) {
    return -1;
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return String(a).localeCompare(String(b), "es", { sensitivity: "base" });
}

export async function listProductsForGrid(input: ListProductsForGridInput): Promise<ListProductsForGridResult> {
  const page = Math.max(1, input.page);
  const limit = Math.min(500, Math.max(1, input.limit));
  const sortField = input.sortField && input.sortField.trim() ? input.sortField.trim() : "name";
  const sortDir = input.sort === "desc" ? "desc" : "asc";

  const all = await ProductRequest.searchProducts(input.query, 50);
  const sorted = [...all].sort((r1, r2) => {
    let va: string | number | boolean | null | undefined;
    let vb: string | number | boolean | null | undefined;
    switch (sortField) {
      case "brand":
        va = r1.brand;
        vb = r2.brand;
        break;
      case "variantCount":
        va = r1.variantCount;
        vb = r2.variantCount;
        break;
      case "isActive":
        va = r1.isActive;
        vb = r2.isActive;
        break;
      default:
        va = r1.name;
        vb = r2.name;
    }
    const c = compare(va, vb);
    return sortDir === "desc" ? -c : c;
  });

  const total = sorted.length;
  const start = (page - 1) * limit;
  const rows = sorted.slice(start, start + limit);

  return { rows, total, page, limit };
}

export async function createProductAction(input: CreateProductFormInput): Promise<CreateProductResult> {
  const name = input.name?.trim() ?? "";
  if (!name) {
    return { success: false, error: "El nombre es obligatorio" };
  }
  const r = await ProductRequest.create({
    name,
    brand: input.brand?.trim() || undefined,
    description: input.description?.trim() || undefined,
    isActive: input.isActive !== false,
  });
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
  }
  return r;
}

export async function createProductVariantAction(
  input: CreateProductVariantFormInput,
): Promise<CreateProductVariantResult> {
  const productId = input.productId?.trim() ?? "";
  const sku = input.sku?.trim() ?? "";
  const unitId = input.unitId?.trim() ?? "";
  if (!productId) {
    return { success: false, error: "Producto no válido" };
  }
  if (!sku) {
    return { success: false, error: "El SKU es obligatorio" };
  }
  if (!unitId) {
    return { success: false, error: "La unidad de medida es obligatoria" };
  }
  const items = input.priceListItems;
  if (!Array.isArray(items) || items.length === 0) {
    return {
      success: false,
      error: "Debe indicar al menos un precio asociado a una lista de precios.",
    };
  }

  const basePrice = typeof input.basePrice === "number" && Number.isFinite(input.basePrice) ? input.basePrice : 0;
  if (basePrice < 0) {
    return { success: false, error: "El precio de referencia no puede ser negativo" };
  }

  const pmpToSend = Math.max(0, Math.round(Number(input.pmp ?? 0)));
  if (!Number.isFinite(pmpToSend)) {
    return { success: false, error: "El PMP no es válido." };
  }

  let attributeValuesToSend: Record<string, string> | undefined;
  if (input.attributeValues != null && typeof input.attributeValues === "object") {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.attributeValues)) {
      const key = k.trim();
      if (!key) {
        continue;
      }
      const val = v == null ? "" : String(v).trim();
      if (val === "") {
        continue;
      }
      cleaned[key] = val;
    }
    if (Object.keys(cleaned).length > 0) {
      attributeValuesToSend = cleaned;
    }
  }

  const seen = new Set<string>();
  for (const it of items) {
    const lid = it.priceListId?.trim() ?? "";
    if (!lid) {
      return { success: false, error: "Cada precio por lista debe tener una lista de precios." };
    }
    if (seen.has(lid)) {
      return { success: false, error: "No puede repetir la misma lista de precios en más de una fila." };
    }
    seen.add(lid);
    const net = Math.round(Number(it.netPrice));
    const gross = Math.round(Number(it.grossPrice));
    if (!Number.isFinite(net) || net < 0 || !Number.isFinite(gross) || gross < 0) {
      return { success: false, error: "Los precios deben ser enteros mayores o iguales a 0." };
    }
  }

  const r = await ProductRequest.createVariant({
    productId,
    sku,
    barcode: input.barcode?.trim() || null,
    basePrice,
    unitId,
    isActive: input.isActive !== false,
    priceListItems: items,
    pmp: pmpToSend,
    attributeValues: attributeValuesToSend,
  });
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
  }
  return r;
}
