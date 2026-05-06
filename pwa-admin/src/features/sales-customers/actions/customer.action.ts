"use server";

import { revalidatePath } from "next/cache";
import { CustomerRequest } from "../infrastructure/customer.request";
import type { CreateCustomerFormInput } from "../types/customer.types";

const CUSTOMERS_PATH = "/sales/customers";

export async function listCustomersForPage(opts: { page?: number; pageSize?: number; query?: string } = {}) {
  return CustomerRequest.list(opts);
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
