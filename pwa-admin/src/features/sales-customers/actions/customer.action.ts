"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { revalidatePath } from "next/cache";
import { CustomerRequest } from "../infrastructure/customer.request";
import { getCompanyInternalCustomerCreditSettingsAction } from "@/features/companies/actions/companies-internal-customer-credit.action";
import type { CreateCustomerFormInput } from "../types/customer.types";

const CUSTOMERS_PATH = "/sales/customers";

export async function listCustomersForPage(opts: { page?: number; pageSize?: number; query?: string } = {}) {
  const list = await CustomerRequest.list(opts);
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  let internalCreditEnabled = true;
  if (companyId) {
    const icc = await getCompanyInternalCustomerCreditSettingsAction(companyId);
    if (icc.success) {
      internalCreditEnabled = icc.internalCustomerCredit.enabled;
    }
  }
  return { ...list, internalCreditEnabled };
}

export type CreateCustomerResult = { success: true } | { success: false; error: string };

export async function createCustomerAction(input: CreateCustomerFormInput): Promise<CreateCustomerResult> {
  const r = await CustomerRequest.create(input);
  if (r.success) {
    revalidatePath(CUSTOMERS_PATH, "page");
    return { success: true };
  }
  return { success: false, error: r.error };
}
