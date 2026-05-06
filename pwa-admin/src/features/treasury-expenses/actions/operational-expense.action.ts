"use server";

import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth/auth-options";
import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { OperationalExpenseRequest } from "../infrastructure/operational-expense.request";
import type {
  ExpenseCategoryOption,
  OperationalExpenseCreateLinkedTributaryDocument,
  OperationalExpenseGridRow,
  OperationalExpenseStatus,
  SupplierOption,
} from "../types/operational-expense.types";

const PATH = "/treasury/expenses";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listOperationalExpensesForGrid(params?: {
  search?: string;
  status?: OperationalExpenseStatus | "";
}): Promise<{
  rows: OperationalExpenseGridRow[];
  total: number;
  categories: ExpenseCategoryOption[];
  suppliers: SupplierOption[];
}> {
  const company = await CompanyRequest.getCurrent();
  if (!company?.id) {
    return { rows: [], total: 0, categories: [], suppliers: [] };
  }

  const [expenses, categories, suppliers] = await Promise.all([
    OperationalExpenseRequest.list(company.id, 500, 0, params?.status || undefined),
    OperationalExpenseRequest.listExpenseCategoryOptions(company.id),
    OperationalExpenseRequest.listSupplierOptions(),
  ]);

  const q = (params?.search ?? "").trim().toLowerCase();
  if (!q) {
    return { rows: expenses.rows, total: expenses.total, categories, suppliers };
  }

  const rows = expenses.rows.filter((r) => {
    const blob = [
      r.name,
      r.referenceNumber,
      r.categoryName,
      r.description ?? "",
      r.status,
      r.operationDate,
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });

  return { rows, total: rows.length, categories, suppliers };
}

export async function createOperationalExpenseAction(input: {
  name: string;
  categoryId: string;
  referenceNumber?: string;
  operationDate: string;
  description?: string;
  supplierId?: string;
  linkedTributaryDocument?: OperationalExpenseCreateLinkedTributaryDocument;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const company = await CompanyRequest.getCurrent();
  if (!company?.id) {
    return { success: false, error: "No hay empresa activa configurada." };
  }

  const session = await getServerSession(authOptions);
  const userId = (
    session?.user?.accessToken || session?.user?.id || ""
  ).trim();
  if (!UUID_RE.test(userId)) {
    return {
      success: false,
      error: "No se pudo determinar el usuario creador (UUID) desde la sesión.",
    };
  }

  if (!input.name.trim()) {
    return { success: false, error: "El nombre es obligatorio." };
  }
  if (!UUID_RE.test(input.categoryId)) {
    return { success: false, error: "Debe seleccionar una categoría válida." };
  }
  if (!input.operationDate.trim()) {
    return { success: false, error: "La fecha de operación es obligatoria." };
  }

  if (input.linkedTributaryDocument) {
    if (!UUID_RE.test(input.supplierId ?? "")) {
      return {
        success: false,
        error: "Con documento tributario debe indicar un proveedor válido.",
      };
    }
    const d = input.linkedTributaryDocument;
    if (d.netAmount < 0.01 || d.totalAmount < 0.01) {
      return { success: false, error: "Los montos del documento deben ser mayores a cero." };
    }
    if (!d.plannedPayments?.length) {
      return { success: false, error: "Debe definir al menos una línea de pago planificado." };
    }
    const sum = d.plannedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    if (Math.abs(sum - d.totalAmount) > 1) {
      return {
        success: false,
        error: "La suma de los pagos planificados debe coincidir con el total del documento.",
      };
    }
  }

  const result = await OperationalExpenseRequest.create({
    companyId: company.id,
    name: input.name,
    categoryId: input.categoryId,
    referenceNumber: input.referenceNumber,
    operationDate: input.operationDate,
    description: input.description?.trim() || undefined,
    supplierId: input.supplierId?.trim() || undefined,
    createdBy: userId,
    status: "DRAFT",
    ...(input.linkedTributaryDocument
      ? { metadata: { linkedTributaryDocument: input.linkedTributaryDocument } }
      : {}),
  });

  if (result.success) {
    revalidatePath(PATH, "page");
  }
  return result;
}

