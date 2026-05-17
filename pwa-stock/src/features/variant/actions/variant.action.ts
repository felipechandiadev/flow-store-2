"use server";

import { revalidatePath } from "next/cache";
import { lookupVariantUseCase } from "../application/lookup-variant.usecase";
import { updateBarcodeUseCase } from "../application/update-barcode.usecase";
import { VariantRequest } from "../infrastructure/variant.request";
import type { ScanMode } from "../domain/scan-mode.entity";
import type { VariantDetail, VariantLookupItem } from "../types/variant.types";

export async function lookupVariantAction(input: {
  code: string;
  mode: ScanMode;
}): Promise<
  | { success: true; items: VariantLookupItem[] }
  | { success: false; error: string }
> {
  const r = await lookupVariantUseCase(input);
  if (!r.ok) return { success: false, error: r.error };
  return { success: true, items: r.items };
}

export async function getVariantDetailAction(
  variantId: string,
): Promise<
  | { success: true; variant: VariantDetail }
  | { success: false; error: string }
> {
  return VariantRequest.getById(variantId.trim());
}

export async function updateBarcodeAction(input: {
  variantId: string;
  barcode: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const r = await updateBarcodeUseCase(input);
  if (!r.ok) return { success: false, error: r.error };
  revalidatePath("/variant");
  return { success: true };
}
