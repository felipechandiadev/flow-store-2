"use server";

import { revalidatePath } from "next/cache";
import { CashHubsRequest } from "../infrastructure/cash-hubs.request";

export async function createCashHubAction(input: {
  companyId: string;
  name: string;
  code?: string;
  notes?: string;
  branchIds: string[];
  pointOfSaleIds: string[];
}): Promise<{ success: true } | { success: false; error: string }> {
  const r = await CashHubsRequest.create({
    companyId: input.companyId,
    name: input.name,
    code: input.code,
    notes: input.notes,
    branchIds: input.branchIds,
    pointOfSaleIds: input.pointOfSaleIds,
  });
  if (!r.success) {
    return { success: false, error: r.error };
  }
  revalidatePath("/treasury/accounts/cash");
  return { success: true };
}
