"use server";

import { revalidatePath } from "next/cache";
import {
  adjustStockUseCase,
  getVariantStockUseCase,
  listStoragesUseCase,
  transferStockUseCase,
} from "../application/stock.usecase";

function revalidateVariant() {
  revalidatePath("/variant");
}

export async function getVariantStockAction(variantId: string, sku?: string) {
  return getVariantStockUseCase(variantId, sku);
}

export async function listStoragesAction() {
  return listStoragesUseCase();
}

export async function adjustStockAction(input: {
  variantId: string;
  storageId: string;
  currentQuantity: number;
  targetQuantity: number;
  note?: string;
}) {
  const r = await adjustStockUseCase(input);
  if (r.success) revalidateVariant();
  return r;
}

export async function transferStockAction(input: {
  variantId: string;
  sourceStorageId: string;
  targetStorageId: string;
  quantity: number;
  note?: string;
}) {
  const r = await transferStockUseCase(input);
  if (r.success) revalidateVariant();
  return r;
}
