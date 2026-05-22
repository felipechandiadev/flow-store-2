import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import type { SaleTransactionDetail } from "../types/sale-transaction-detail.types";
import { mapSaleTransactionDetailToPrintData } from "./map-sale-transaction-detail-to-print-data";
import {
  printAdminSaleDocumentExplicit,
  printAdminSaleTicketExplicit,
} from "./print-admin-sale-receipt";

const REPRINTABLE_TYPES = new Set(["SALE", "BACKORDER"]);

export function canAdminReprintSaleReceipt(transactionType: string): boolean {
  return REPRINTABLE_TYPES.has(String(transactionType ?? "").trim());
}

export async function reprintAdminSaleTicket(
  detail: SaleTransactionDetail,
  company: CompanyDetails | null,
): Promise<{ success: boolean; message?: string; channel?: "agent" | "skipped" }> {
  if (!canAdminReprintSaleReceipt(detail.transactionType)) {
    return { success: false, message: "Este tipo de transacción no admite ticket" };
  }
  const data = mapSaleTransactionDetailToPrintData(detail, company);
  const channel = await printAdminSaleTicketExplicit(data);
  if (channel === "skipped") {
    return {
      success: false,
      message:
        "No se pudo enviar el ticket al agente. Configure alias «Tickets» en Impresión local y KaiPrinters.",
    };
  }
  return { success: true, channel };
}

export function reprintAdminSaleDocument(
  detail: SaleTransactionDetail,
  company: CompanyDetails | null,
): { success: boolean; message?: string } {
  if (!canAdminReprintSaleReceipt(detail.transactionType)) {
    return { success: false, message: "Este tipo de transacción no admite documento" };
  }
  const data = mapSaleTransactionDetailToPrintData(detail, company);
  printAdminSaleDocumentExplicit(data);
  return { success: true };
}
