"use server";

import { revalidatePath } from "next/cache";
import { TreasuryOperationsRequest } from "../infrastructure/treasury-operations.request";

const PATH = "/treasury/accounts/bank";

export async function postCapitalContributionAction(input: {
  shareholderId: string;
  bankAccountKey: string;
  amount: number;
  notes?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await TreasuryOperationsRequest.postCapitalContribution(input);
    revalidatePath(PATH, "page");
    revalidatePath("/settings/company", "page");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al registrar aporte" };
  }
}

export async function postDividendWithdrawalAction(input: {
  shareholderId: string;
  bankAccountKey: string;
  amount: number;
  notes?: string;
  taxRetention?: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await TreasuryOperationsRequest.postDividendWithdrawal(input);
    revalidatePath(PATH, "page");
    revalidatePath("/settings/company", "page");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al registrar retiro" };
  }
}

export async function postCashDepositAction(input: {
  bankAccountKey: string;
  amount: number;
  notes?: string;
  cashHubId?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await TreasuryOperationsRequest.postCashDeposit(input);
    revalidatePath(PATH, "page");
    revalidatePath("/treasury/accounts/cash", "page");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al registrar depósito" };
  }
}

export async function postPettyCashWithdrawalAction(input: {
  bankAccountKey: string;
  amount: number;
  notes?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await TreasuryOperationsRequest.postPettyCashWithdrawal(input);
    revalidatePath(PATH, "page");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al registrar giro a caja" };
  }
}
