import type { SaleReceiptPrintData } from "./backorder-document-print.types";
import { printSaleReceiptDocument } from "./backorder-document-print";
import { printAdminSaleTicket } from "./admin-backorder-ticket-print";

/** Ticket 80 mm vía KaiPrinters ESC/POS o navegador. */
export async function printAdminSaleTicketExplicit(
  data: SaleReceiptPrintData,
): Promise<"agent" | "browser"> {
  return printAdminSaleTicket(data);
}

/** Documento en hoja vía KaiPrinters (PDF) o navegador. */
export async function printAdminSaleDocumentExplicit(
  data: SaleReceiptPrintData,
): Promise<"agent" | "browser"> {
  return printSaleReceiptDocument(data);
}
