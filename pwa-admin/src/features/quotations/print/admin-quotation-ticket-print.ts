import {
  agentSupportsPosQuotationTicket,
  agentTicketEscposEnabled,
  type HelloResponseData,
  type PosQuotationTicketPayload,
} from "@flowstore/print-service-client";
import type { PrintServiceConnection } from "@flowstore/print-service-client";
import { fetchReceiptLogoBase64 } from "@/features/print/lib/fetch-receipt-logo-base64";
import {
  enqueueAdminPrint,
  isAdminPrintAgentConfigured,
  withAdminPrintAgentConnection,
} from "@/features/print/lib/admin-agent-print";
import { printHtmlInHiddenIframe } from "@/features/print/lib/print-html-in-hidden-iframe";
import {
  buildQuotationReceiptHtml,
  type QuotationPrintInput,
} from "./quotation-print-html";

function quotationToTicketPayload(
  input: QuotationPrintInput,
  logoBase64: string | null,
): PosQuotationTicketPayload {
  const q = input.quotation;
  const c = input.company;
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  return {
    version: 1,
    documentNumber: q.documentNumber?.trim() || q.id,
    issuedAt: q.issuedAt,
    validUntil: q.validUntil,
    company: {
      razonSocial: c?.razonSocial?.trim() || displayName,
      nombreFantasia: c?.nombreFantasia?.trim() || null,
      rut: c?.rut?.trim() || null,
      businessActivity: c?.businessActivity?.trim() || null,
      logoBase64,
    },
    customerName: q.customerName?.trim() || null,
    customerDocument: q.customerDocument?.trim() || null,
    branchName: input.branchName?.trim() || null,
    pointOfSaleName: input.pointOfSaleName?.trim() || null,
    lines: (q.lines ?? []).map((l) => {
      const qty = Number(l.quantity) || 0;
      const unitWithTax = qty > 0 ? (Number(l.total) || 0) / qty : Number(l.unitPrice) || 0;
      return {
        productName: l.productName,
        variantName: l.variantName?.trim() || null,
        productSku: l.productSku?.trim() || null,
        quantity: l.quantity,
        unitPrice: unitWithTax,
        total: l.total,
      };
    }),
    subtotal: q.subtotal,
    taxAmount: q.taxAmount,
    discountAmount: q.discountAmount ?? 0,
    total: q.total,
    notes: q.notes?.trim() || null,
    terms: q.terms?.trim() || null,
  };
}

async function enqueueQuotationTicket(
  conn: PrintServiceConnection,
  ticket: PosQuotationTicketPayload,
  meta: { filename: string; documentType: string; internalFolio: string },
): Promise<void> {
  await enqueueAdminPrint(conn, "tickets", {
    type: "pos-quotation-ticket",
    ticket,
    filename: meta.filename,
    copies: 1,
    documentType: meta.documentType,
    internalFolio: meta.internalFolio,
  });
}

export async function printAdminQuotationTicket(
  input: QuotationPrintInput,
): Promise<{ success: boolean; message?: string; channel?: "agent" | "browser" }> {
  if (typeof window === "undefined") {
    return { success: false, message: "Impresión no disponible" };
  }

  const folio = input.quotation.documentNumber?.trim() || "cotizacion";
  const meta = {
    filename: `${folio}.pdf`,
    documentType: "QUOTATION",
    internalFolio: folio,
  };

  if (!isAdminPrintAgentConfigured("tickets")) {
    const html = buildQuotationReceiptHtml(input, window.location.origin);
    printHtmlInHiddenIframe(html, "Impresión cotización");
    return { success: true, channel: "browser" };
  }

  const logoBase64 = await fetchReceiptLogoBase64(null, window.location.origin);
  const ticket = quotationToTicketPayload(input, logoBase64);
  let escposMode = false;
  let enqueued = false;

  try {
    await withAdminPrintAgentConnection("tickets", async (conn, hello: HelloResponseData | null) => {
      escposMode = await agentTicketEscposEnabled(conn, "tickets");
      if (!agentSupportsPosQuotationTicket(hello)) {
        throw new Error("agent_no_pos_quotation_ticket");
      }
      await enqueueQuotationTicket(conn, ticket, meta);
      enqueued = true;
    });
    if (enqueued) return { success: true, channel: "agent" };
  } catch (e) {
    if (escposMode) {
      console.warn(
        "[KaiStore admin print] cotización: ESC/POS en KaiPrinters — sin PDF HTML de respaldo.",
        e,
      );
      return {
        success: false,
        message:
          "No se pudo imprimir en térmica. Revise KaiPrinters o desactive ESC/POS para usar respaldo.",
      };
    }
  }

  const html = buildQuotationReceiptHtml(input, window.location.origin);
  printHtmlInHiddenIframe(html, "Impresión cotización");
  return { success: true, channel: "browser" };
}
