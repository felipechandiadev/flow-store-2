"use server";

import { revalidatePath } from "next/cache";
import { CreatePointOfSaleUseCase } from "../application/create-point-of-sale.usecase";
import { DeletePointOfSaleUseCase } from "../application/delete-point-of-sale.usecase";
import type { CreatePointOfSaleFormInput } from "../domain/point-of-sale.entity";
import type { CreatePointOfSaleResult, DeletePointOfSaleResult } from "../types/point-of-sale.types";

const POS_PATH = "/sales/points-of-sale";

export async function createPointOfSaleAction(
  input: CreatePointOfSaleFormInput
): Promise<CreatePointOfSaleResult> {
  const result = await CreatePointOfSaleUseCase.execute(input);
  if (result.success) {
    revalidatePath(POS_PATH);
  }
  return result;
}

export async function deletePointOfSaleAction(id: string): Promise<DeletePointOfSaleResult> {
  const result = await DeletePointOfSaleUseCase.execute(id);
  if (result.success) {
    revalidatePath(POS_PATH);
  }
  return result;
}
