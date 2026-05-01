"use server";

import { revalidatePath } from "next/cache";
import { SupplierRequest } from "../infrastructure/supplier.request";
import type { SupplierGridRow } from "../types/supplier.types";

const SUPPLIERS_PATH = "/purchasing/suppliers";

export type CreateSupplierFormInput = {
  personType: "NATURAL" | "COMPANY";
  firstName?: string;
  lastName?: string;
  businessName?: string;
  documentType: "RUN" | "RUT" | "PASSPORT" | "OTHER";
  documentNumber: string;
  email?: string;
  phone?: string;
  address?: string;
  supplierType: string;
  defaultPaymentTermDays: number;
};

export type CreateSupplierResult = { success: true; id: string } | { success: false; error: string };

export async function listSuppliersForGrid(): Promise<{ rows: SupplierGridRow[]; total: number }> {
  return SupplierRequest.list(500, 0);
}

export async function createSupplierAction(input: CreateSupplierFormInput): Promise<CreateSupplierResult> {
  const personType = input.personType === "COMPANY" ? "COMPANY" : "NATURAL";
  const docNum = input.documentNumber?.trim() ?? "";
  if (!docNum) {
    return { success: false, error: "El número de documento es obligatorio." };
  }

  if (personType === "COMPANY") {
    const bn = input.businessName?.trim() ?? "";
    if (!bn) {
      return { success: false, error: "La razón social es obligatoria para una empresa." };
    }
    const person = {
      type: "COMPANY" as const,
      firstName: bn,
      businessName: bn,
      documentType: "RUT" as const,
      documentNumber: docNum,
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      address: input.address?.trim() || undefined,
    };
    const r = await SupplierRequest.create({
      person,
      supplierType: input.supplierType?.trim() || "DISTRIBUTOR",
      defaultPaymentTermDays: Math.max(0, Math.round(Number(input.defaultPaymentTermDays) || 0)),
    });
    if (r.success) {
      revalidatePath(SUPPLIERS_PATH, "page");
    }
    return r;
  }

  const fn = input.firstName?.trim() ?? "";
  if (!fn) {
    return { success: false, error: "El nombre es obligatorio para una persona." };
  }
  const dt = input.documentType;
  if (dt === "RUT") {
    return { success: false, error: "Una persona no puede usar RUT; elija empresa o otro documento." };
  }

  const person = {
    type: "NATURAL" as const,
    firstName: fn,
    lastName: input.lastName?.trim() || undefined,
    documentType: dt,
    documentNumber: docNum,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
  };

  const r = await SupplierRequest.create({
    person,
    supplierType: input.supplierType?.trim() || "DISTRIBUTOR",
    defaultPaymentTermDays: Math.max(0, Math.round(Number(input.defaultPaymentTermDays) || 0)),
  });
  if (r.success) {
    revalidatePath(SUPPLIERS_PATH, "page");
  }
  return r;
}
