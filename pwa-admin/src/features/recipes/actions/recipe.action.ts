"use server";

import { revalidatePath } from "next/cache";
import { PurchasingVariantSearchRequest } from "@/features/purchasing-document/infrastructure/purchasing-variant-search.request";
import type { PurchasingVariantSearchResult } from "@/features/purchasing-document/types/purchasing-document.types";
import { RecipeRequest, type CreateRecipePayload } from "../infrastructure/recipe.request";
import type { RecipeDto, RecipeTypeDto } from "../types/recipe.types";

const PRODUCTS_PATH = "/catalog/products";

/** Misma API que recepciones / órdenes de compra (`product-variants/purchasing-search`). */
export async function searchRecipeVariantCatalogAction(
  q: string,
  page: number,
): Promise<PurchasingVariantSearchResult> {
  return PurchasingVariantSearchRequest.search({
    q: q.trim(),
    page: Math.max(1, page),
    pageSize: 10,
  });
}

export async function listRecipesByOutputVariantAction(outputVariantId: string): Promise<RecipeDto[]> {
  const id = outputVariantId?.trim() ?? "";
  if (!id) {
    return [];
  }
  try {
    return await RecipeRequest.list(id);
  } catch {
    return [];
  }
}

export type CreateRecipeFormInput = {
  outputVariantId: string;
  recipeType: RecipeTypeDto;
  version: number;
  lines: Array<{
    inputVariantId: string;
    qtyPerOutputUnit: number;
    wasteFactor?: number;
  }>;
};

export type CreateRecipeResult = { success: true; id: string } | { success: false; error: string };

export async function createRecipeAction(input: CreateRecipeFormInput): Promise<CreateRecipeResult> {
  const outputVariantId = input.outputVariantId?.trim() ?? "";
  if (!outputVariantId) {
    return { success: false, error: "Variante de salida no válida" };
  }
  if (!input.lines?.length) {
    return { success: false, error: "Agregue al menos una línea de insumo" };
  }
  const lines = input.lines.map((l, i) => ({
    inputVariantId: l.inputVariantId.trim(),
    qtyPerOutputUnit: l.qtyPerOutputUnit,
    wasteFactor: l.wasteFactor ?? 0,
    sortOrder: i + 1,
  }));
  for (const l of lines) {
    if (!l.inputVariantId) {
      return { success: false, error: "Cada línea debe tener un insumo (variante)" };
    }
    if (!Number.isFinite(l.qtyPerOutputUnit) || l.qtyPerOutputUnit <= 0) {
      return { success: false, error: "La cantidad por unidad producida debe ser mayor que cero" };
    }
  }
  const version = Math.max(1, Math.floor(Number(input.version) || 1));
  const payload: CreateRecipePayload = {
    outputVariantId,
    type: input.recipeType,
    version,
    isActive: true,
    lines,
  };
  const r = await RecipeRequest.create(payload);
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
  }
  return r;
}
