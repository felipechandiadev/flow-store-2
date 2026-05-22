"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { ReceptionPosRequest } from "../infrastructure/reception-pos.request";
import type {
  CreateDirectReceptionInput,
  CreateReceptionResult,
} from "../types/reception.types";
import type { ReceptionSupplierDocumentPaymentPayload } from "../types/reception-document-payment.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DTE_TYPES = new Set(["invoice", "receipt", "guide", "other"]);

function hasCashPaidLine(payment: ReceptionSupplierDocumentPaymentPayload | null | undefined): boolean {
  if (!payment) return false;
  return payment.paidLines.some((l) => l.paymentMethod === "CASH" && (Number(l.amount) || 0) > 0);
}

export async function createDirectReceptionPosAction(
  input: CreateDirectReceptionInput & {
    cashSessionId?: string | null;
    pointOfSaleId?: string | null;
  },
): Promise<CreateReceptionResult> {
  const session = await getServerSession(authOptions);
  const userId = String(
    (session?.user as { id?: string })?.id || "",
  ).trim();
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

  const cashSessionId = input.cashSessionId?.trim() || null;
  const pointOfSaleId = input.pointOfSaleId?.trim() || null;
  if (hasCashPaidLine(input.supplierDocumentPayment) && !cashSessionId) {
    return {
      success: false,
      error: "Abra una sesión de caja en el POS para pagar en efectivo desde el cajón.",
    };
  }

  let supplierDocumentPayment = input.supplierDocumentPayment;
  if (supplierDocumentPayment && cashSessionId) {
    supplierDocumentPayment = {
      ...supplierDocumentPayment,
      paidLines: supplierDocumentPayment.paidLines.map((l) =>
        l.paymentMethod === "CASH"
          ? { ...l, cashSessionId: l.cashSessionId?.trim() || cashSessionId, cashHubId: null }
          : l,
      ),
    };
  }

  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i];
    const vid = line.productVariantId?.trim() ?? "";
    if (!UUID_RE.test(vid)) {
      return { success: false, error: `Línea ${i + 1}: falta variante de producto válida.` };
    }
    const cost = Number(line.unitCost ?? line.unitPrice ?? 0) || 0;
    if (cost <= 0) {
      return {
        success: false,
        error: `Línea ${i + 1}: ingrese costo unitario de compra mayor a cero (define el PMP).`,
      };
    }
    if ((Number(line.quantity) || 0) <= 0) {
      return { success: false, error: `Línea ${i + 1}: la cantidad debe ser mayor a cero.` };
    }
  }

  try {
    const json = (await ReceptionPosRequest.createDirect({
      ...input,
      supplierDocumentPayment,
      storageId: storageTrim,
      supplierId: input.supplierId.trim(),
      userId,
      cashSessionId,
      pointOfSaleId,
    })) as {
      reception?: { id?: string; documentNumber?: string | null };
      supplierDocumentError?: string | null;
      transactionError?: string | null;
    };
    const transactionError =
      json?.transactionError != null && String(json.transactionError).trim()
        ? String(json.transactionError).trim()
        : null;
    if (transactionError) {
      return {
        success: false,
        error: `No se registró el ingreso de stock ni el PMP: ${transactionError}`,
      };
    }
    const rec = json?.reception;
    const internalDocumentNumber =
      rec?.documentNumber != null && String(rec.documentNumber).trim()
        ? String(rec.documentNumber).trim()
        : rec?.id != null && String(rec.id).trim()
          ? String(rec.id).trim()
          : null;
    return {
      success: true,
      receptionId: rec?.id != null ? String(rec.id) : undefined,
      internalDocumentNumber,
      supplierDocumentError:
        json?.supplierDocumentError != null && String(json.supplierDocumentError).trim()
          ? String(json.supplierDocumentError).trim()
          : null,
      transactionError: null,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al crear la recepción." };
  }
}
