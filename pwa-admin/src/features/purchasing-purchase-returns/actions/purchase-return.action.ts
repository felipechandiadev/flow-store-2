"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { PurchaseReturnRequest } from "../infrastructure/purchase-return.request";
import type { CreatePurchaseReturnInput } from "../types/purchase-return.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listPurchaseReturnsForPage(
  opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {},
) {
  return PurchaseReturnRequest.list(opts);
}

export async function createPurchaseReturnAction(
  input: CreatePurchaseReturnInput,
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  const session = await getServerSession(authOptions);
  const userId = String(session?.user?.accessToken || session?.user?.id || "").trim();
  if (!UUID_RE.test(userId)) {
    return { success: false, error: "Sesión inválida o usuario no identificado." };
  }
  if (!UUID_RE.test(input.branchId)) {
    return { success: false, error: "Falta sucursal (branch) válida." };
  }
  if (!UUID_RE.test(input.supplierId)) {
    return { success: false, error: "Proveedor inválido." };
  }
  if (!UUID_RE.test(input.storageId)) {
    return { success: false, error: "Almacén inválido." };
  }
  try {
    const data = await PurchaseReturnRequest.create({ ...input, userId });
    revalidatePath("/purchasing/transactions/purchase-returns", "layout");
    revalidatePath("/purchasing/purchase-returns");
    revalidatePath("/purchasing/purchase-returns/list");
    revalidatePath("/purchasing/dte/credit-notes");
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al crear la devolución." };
  }
}
