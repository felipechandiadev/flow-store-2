import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import { printHtmlInHiddenIframe } from "@/features/print/lib/print-html-in-hidden-iframe";
import type { QuotationDetail } from "../types/quotation.types";
import { printAdminQuotationTicket } from "./admin-quotation-ticket-print";
import {
  buildQuotationDocumentHtml,
  type QuotationPrintInput,
} from "./quotation-print-html";

export function toQuotationPrintInput(
  quotation: QuotationDetail,
  company: CompanyDetails | null,
): QuotationPrintInput {
  return { quotation, company };
}

export async function reprintAdminQuotationTicket(
  quotation: QuotationDetail,
  company: CompanyDetails | null,
): Promise<{ success: boolean; message?: string }> {
  const res = await printAdminQuotationTicket(toQuotationPrintInput(quotation, company));
  if (!res.success) {
    return { success: false, message: res.message ?? "No se pudo imprimir el ticket" };
  }
  return { success: true };
}

export function reprintAdminQuotationDocument(
  quotation: QuotationDetail,
  company: CompanyDetails | null,
): { success: boolean; message?: string } {
  if (typeof window === "undefined") {
    return { success: false, message: "Impresión no disponible" };
  }
  const html = buildQuotationDocumentHtml(toQuotationPrintInput(quotation, company));
  const folio = quotation.documentNumber?.trim() || "cotizacion";
  printHtmlInHiddenIframe(html, "Impresión cotización documento");
  return { success: true };
}
