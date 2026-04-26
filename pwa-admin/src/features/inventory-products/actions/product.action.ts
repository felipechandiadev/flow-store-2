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

export type CreateProductVariantFormInput = {
  productId: string;
  sku: string;
  barcode?: string | null;
  basePrice: number;
  unitId: string;
  isActive?: boolean;
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
  const basePrice = typeof input.basePrice === "number" && Number.isFinite(input.basePrice) ? input.basePrice : 0;
  if (basePrice < 0) {
    return { success: false, error: "El precio base no puede ser negativo" };
  }
  const r = await ProductRequest.createVariant({
    productId,
    sku,
    barcode: input.barcode?.trim() || null,
    basePrice,
    unitId,
    isActive: input.isActive !== false,
  });
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
  }
  return r;
}
