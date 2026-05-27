"use server";

import { revalidatePath } from "next/cache";
import { EmployeeRequest } from "../infrastructure/employee.request";
import type { EmployeeGridRow } from "../types/employee.types";

const EMPLOYEES_PATH = "/hr/employees";

export type CreateEmployeeFormInput = {
  firstName: string;
  lastName?: string;
  documentType: "RUN" | "PASSPORT" | "DNI";
  documentNumber: string;
  email?: string;
  phone?: string;
  branchId?: string | null;
  employmentType: string;
  hireDate: string;
  baseSalary?: string | null;
};

export type CreateEmployeeResult = { success: true; id: string } | { success: false; error: string };

export async function listEmployeesForGridAction(opts: {
  includeTerminated?: boolean;
  status?: string;
  branchId?: string;
  companyId?: string;
} = {}): Promise<EmployeeGridRow[]> {
  return EmployeeRequest.list(opts);
}

export async function createEmployeeAction(
  input: CreateEmployeeFormInput,
): Promise<CreateEmployeeResult> {
  const fn = input.firstName?.trim() ?? "";
  if (!fn) {
    return { success: false, error: "El nombre es obligatorio." };
  }
  const docNum = input.documentNumber?.trim() ?? "";
  if (!docNum) {
    return { success: false, error: "El número de documento es obligatorio." };
  }
  const hireDate = input.hireDate?.trim() ?? "";
  if (!hireDate) {
    return { success: false, error: "La fecha de ingreso es obligatoria." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) {
    return { success: false, error: "La fecha de ingreso debe tener formato AAAA-MM-DD." };
  }

  const personRes = await EmployeeRequest.createPerson({
    firstName: fn,
    lastName: input.lastName?.trim() || undefined,
    documentType: input.documentType,
    documentNumber: docNum,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
  });
  if (!personRes.success) {
    return personRes;
  }

  let baseSalary: string | null = null;
  if (input.baseSalary != null && String(input.baseSalary).trim() !== "") {
    const n = Math.round(Number(String(input.baseSalary).replace(/\D/g, "")) || 0);
    if (n > 0) {
      baseSalary = String(n);
    }
  }

  const empRes = await EmployeeRequest.create({
    personId: personRes.personId,
    branchId: input.branchId?.trim() || null,
    employmentType: input.employmentType?.trim() || "FULL_TIME",
    hireDate,
    baseSalary,
  });
  if (empRes.success) {
    revalidatePath(EMPLOYEES_PATH, "page");
  }
  return empRes;
}
