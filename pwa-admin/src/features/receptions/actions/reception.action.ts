"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { ReceptionRequest } from "../infrastructure/reception.request";
import type {
  CreateDirectReceptionInput,
  CreateReceptionResult,
  ReceptionListForGridResult,
  ReceptionFetchResult,
} from "../types/reception.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DTE_TYPES = new Set(["invoice", "receipt", "guide", "other"]);

export async function listReceptionsForGridAction(opts: {
  page?: number;
  limit?: number;
} = {}): Promise<ReceptionListForGridResult> {
  const page = Math.max(1, Math.round(opts.page ?? 1));
  const limit = Math.min(200, Math.max(1, Math.round(opts.limit ?? 25)));
  const offset = (page - 1) * limit;
  return ReceptionRequest.listForGrid({ limit, offset });
}

export async function getReceptionDetailForReturnAction(receptionId: string): Promise<ReceptionFetchResult> {
  try {
    const reception = await ReceptionRequest.getById(receptionId.trim());
    return { success: true, reception };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo cargar la recepción.",
    };
  }
}

export async function resolveReceptionBySupplierDocumentAction(
  supplierId: string,
  documentRef: string,
): Promise<ReceptionFetchResult> {
  try {
    const reception = await ReceptionRequest.resolveBySupplierDocumentRef(
      supplierId.trim(),
      documentRef.trim(),
    );
    return { success: true, reception };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se encontró recepción para esa referencia.",
    };
  }
}

export async function createDirectReceptionAction(input: CreateDirectReceptionInput): Promise<CreateReceptionResult> {
  const session = await getServerSession(authOptions);
  const userId = String(session?.user?.accessToken || session?.user?.id || "").trim();
  if (!UUID_RE.test(userId)) {
    return { success: false, error: "Sesión inválida o usuario no identificado." };
  }
  if (!UUID_RE.test(input.branchId)) {
    return { success: false, error: "Falta sucursal (branch) válida." };
  }
  if (!DTE_TYPES.has(input.documentType)) {
    return { success: false, error: "Tipo de documento inválido." };
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
    const json = (await ReceptionRequest.createDirect({
      ...input,
      storageId: storageTrim,
      supplierId: input.supplierId.trim(),
      userId,
    })) as {
      reception?: { id?: string; documentNumber?: string | null };
      supplierDocumentError?: string | null;
    };
    const rec = json?.reception;
    const internalDocumentNumber =
      rec?.documentNumber != null && String(rec.documentNumber).trim()
        ? String(rec.documentNumber).trim()
        : rec?.id != null && String(rec.id).trim()
          ? String(rec.id).trim()
          : null;
    revalidatePath("/purchasing/transactions/receptions", "layout");
    revalidatePath("/purchasing/receptions", "layout");
    return {
      success: true,
      receptionId: rec?.id != null ? String(rec.id) : undefined,
      internalDocumentNumber,
      supplierDocumentError:
        json?.supplierDocumentError != null && String(json.supplierDocumentError).trim()
          ? String(json.supplierDocumentError).trim()
          : null,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al crear la recepción." };
  }
}
