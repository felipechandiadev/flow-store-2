"use server";

import { revalidatePath } from "next/cache";
import { createQuickProductUseCase } from "../application/create-quick-product.usecase";
import type { QuickCreateProductInput } from "../domain/quick-create-product.entity";

export async function createQuickProductAction(
  input: QuickCreateProductInput,
): Promise<
  | { success: true; variantId: string; sku: string }
  | { success: false; error: string }
> {
  const r = await createQuickProductUseCase(input);
  if (!r.ok) return { success: false, error: r.error };
  revalidatePath("/variant");
  return { success: true, variantId: r.variantId, sku: r.sku };
}
