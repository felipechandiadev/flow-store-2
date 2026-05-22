import { getAdminDocumentPrintMode } from "@flowstore/print-service-client";
import type { SaleReceiptPrintData } from "./backorder-document-print.types";
import { printSaleReceiptDocument } from "./backorder-document-print";
import { printAdminSaleTicket } from "./admin-backorder-ticket-print";

/**
 * Imprime un encargo según Impresión local del admin (ticket 80 mm o documento en hoja).
 */
export async function printAdminBackorderReceipt(
  data: SaleReceiptPrintData,
): Promise<void> {
  const mode = getAdminDocumentPrintMode("backorder");
  if (mode === "document") {
    printSaleReceiptDocument(data);
    return;
  }
  const channel = await printAdminSaleTicket(data);
  if (channel === "skipped") {
    printSaleReceiptDocument(data);
  }
}
