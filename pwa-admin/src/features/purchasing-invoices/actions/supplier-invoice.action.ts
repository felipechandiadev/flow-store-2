"use server";

import { revalidatePath } from "next/cache";
import { SupplierInvoiceRequest } from "../infrastructure/supplier-invoice.request";
import type { CreateSupplierInvoiceInput } from "../types/supplier-invoice.types";

export async function listSupplierInvoicesForPage(opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {}) {
  return SupplierInvoiceRequest.list(opts);
}

export async function createSupplierInvoiceAction(input: CreateSupplierInvoiceInput) {
  const res = await SupplierInvoiceRequest.create(input);
  revalidatePath("/purchasing/invoices");
  revalidatePath("/purchasing/invoices/list");
  return res;
}

