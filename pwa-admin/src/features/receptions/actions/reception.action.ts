"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { ReceptionRequest } from "../infrastructure/reception.request";
import type { CreateDirectReceptionInput, CreateReceptionResult } from "../types/reception.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DTE_TYPES = new Set(["invoice", "receipt", "guide", "other"]);

export async function createDirectReceptionAction(input: CreateDirectReceptionInput): Promise<CreateReceptionResult> {
  const session = await getServerSession(authOptions);
  const userId = String(session?.user?.accessToken || session?.user?.id || "").trim();
  if (!UUID_RE.test(userId)) {
    return { success: false, error: "Sesión inválida o usuario no identificado." };
  }
  if (!UUID_RE.test(input.branchId)) {
    return { success: false, error: "Falta sucursal (branch) válida." };
  }
  if (!DTE_TYPES.has(input.dteType)) {
    return { success: false, error: "Tipo de DTE inválido." };
  }
  const storageTrim = input.storageId?.trim();
  if (!storageTrim || !UUID_RE.test(storageTrim)) {
    return { success: false, error: "Seleccione un almacén destino válido." };
  }
  if (!input.supplierId?.trim() || !UUID_RE.test(input.supplierId.trim())) {
    return { success: false, error: "Seleccione un proveedor válido." };
  }
  if (!input.lines?.length) {
    return { success: false, error: "Agregue al menos una línea de producto." };
  }

  try {
    await ReceptionRequest.createDirect({
      ...input,
      storageId: storageTrim,
      supplierId: input.supplierId.trim(),
      userId,
    });
    revalidatePath("/purchasing/receptions", "layout");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al crear la recepción." };
  }
}
