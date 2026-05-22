import type { SaleReceiptPrintData } from "./backorder-document-print.types";
import { printSaleReceiptDocument } from "./backorder-document-print";
import { printAdminSaleTicket } from "./admin-backorder-ticket-print";

/** Ticket 80 mm vía KaiPrinters (o omitido si no hay alias Tickets). */
export async function printAdminSaleTicketExplicit(
  data: SaleReceiptPrintData,
): Promise<"agent" | "skipped"> {
  return printAdminSaleTicket(data);
}

/** Documento en hoja (navegador / diálogo de impresión). */
export function printAdminSaleDocumentExplicit(data: SaleReceiptPrintData): void {
  printSaleReceiptDocument(data);
}
