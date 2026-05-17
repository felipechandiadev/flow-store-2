"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { CompaniesInternalCustomerCreditRequest } from "../infrastructure/companies-internal-customer-credit.request";

/** `true` si la empresa tiene habilitado el crédito interno de clientes. */
export async function getInternalCustomerCreditEnabledAction(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId?.trim();
  if (!companyId) return false;
  const res = await CompaniesInternalCustomerCreditRequest.get(companyId);
  if (!res.success) return false;
  return res.internalCustomerCredit.enabled === true;
}
