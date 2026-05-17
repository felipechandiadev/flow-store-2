"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { revalidatePath } from "next/cache";
import { CustomerRequest } from "../infrastructure/customer.request";
import { getCompanyInternalCustomerCreditSettingsAction } from "@/features/companies/actions/companies-internal-customer-credit.action";
import type {
  CreateCustomerFormInput,
  CustomerDetailView,
  UpdateCustomerPayload,
} from "../types/customer.types";

const CUSTOMERS_PATH = "/sales/customers";

export async function listCustomersForPage(opts: { page?: number; pageSize?: number; query?: string } = {}) {
  const list = await CustomerRequest.list(opts);
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  let internalCreditEnabled = false;
  if (companyId) {
    const icc = await getCompanyInternalCustomerCreditSettingsAction(companyId);
    if (icc.success) {
      internalCreditEnabled = icc.internalCustomerCredit.enabled === true;
    }
  }
  return { ...list, internalCreditEnabled };
}

export type CreateCustomerResult = { success: true } | { success: false; error: string };

export async function updateCustomerAction(
  customerId: string,
  payload: UpdateCustomerPayload,
): Promise<{ success: true; customer: CustomerDetailView } | { success: false; error: string }> {
  const id = customerId?.trim();
  if (!id) {
    return { success: false, error: "Cliente no especificado." };
  }
  const r = await CustomerRequest.update(id, payload);
  if (r.success) {
    revalidatePath(CUSTOMERS_PATH, "page");
  }
  return r;
}

export async function getCustomerDetailAction(
  customerId: string,
): Promise<{ success: true; customer: CustomerDetailView } | { success: false; error: string }> {
  const id = customerId?.trim();
  if (!id) {
    return { success: false, error: "Cliente no especificado." };
  }
  const customer = await CustomerRequest.getById(id);
  if (!customer) {
    return { success: false, error: "No se pudo cargar el cliente." };
  }
  return { success: true, customer };
}

export async function getCustomerPaymentsListAction(
  customerId: string,
): Promise<{ success: true; rows: Record<string, unknown>[] } | { success: false; error: string }> {
  const id = customerId?.trim();
  if (!id) {
    return { success: false, error: "Cliente no especificado." };
  }
  try {
    const rows = await CustomerRequest.getPayments(id);
    return { success: true, rows };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al cargar pagos." };
  }
}

export async function getCustomerPurchasesListAction(
  customerId: string,
): Promise<{ success: true; rows: Record<string, unknown>[] } | { success: false; error: string }> {
  const id = customerId?.trim();
  if (!id) {
    return { success: false, error: "Cliente no especificado." };
  }
  try {
    const rows = await CustomerRequest.getPurchases(id);
    return { success: true, rows };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al cargar compras." };
  }
}

export async function getCustomerReturnsListAction(
  customerId: string,
): Promise<{ success: true; rows: Record<string, unknown>[] } | { success: false; error: string }> {
  const id = customerId?.trim();
  if (!id) {
    return { success: false, error: "Cliente no especificado." };
  }
  try {
    const rows = await CustomerRequest.getCustomerReturns(id);
    return { success: true, rows };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al cargar devoluciones." };
  }
}

export async function getCustomerCreditNotesListAction(
  customerId: string,
): Promise<{ success: true; rows: Record<string, unknown>[] } | { success: false; error: string }> {
  const id = customerId?.trim();
  if (!id) {
    return { success: false, error: "Cliente no especificado." };
  }
  try {
    const rows = await CustomerRequest.getCustomerCreditNotes(id);
    return { success: true, rows };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al cargar notas de crédito.",
    };
  }
}

export async function getCustomerPendingQuotasListAction(
  customerId: string,
): Promise<{ success: true; rows: Record<string, unknown>[] } | { success: false; error: string }> {
  const id = customerId?.trim();
  if (!id) {
    return { success: false, error: "Cliente no especificado." };
  }
  try {
    const rows = await CustomerRequest.getPendingQuotas(id);
    return { success: true, rows };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al cargar cuotas." };
  }
}

export async function createCustomerAction(input: CreateCustomerFormInput): Promise<CreateCustomerResult> {
  const r = await CustomerRequest.create(input);
  if (r.success) {
    revalidatePath(CUSTOMERS_PATH, "page");
    return { success: true };
  }
  return { success: false, error: r.error };
}
