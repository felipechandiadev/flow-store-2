import {
  agentSupportsPosCustomerCreditNoteTicket,
  agentTicketEscposEnabled,
  isPosAgentPrintConfiguredForPurpose,
  POS_CUSTOMER_CREDIT_NOTE_TICKET_PAYLOAD_VERSION,
  type PosCustomerCreditNoteTicketPayload,
} from "@flowstore/print-service-client";
import type { CustomerCreditNotePrintData } from "@/features/customer-credit-notes/types/customer-credit-note-print.types";
import { fetchReceiptLogoBase64 } from "@/features/pos-print/lib/pos-sale-ticket-agent";
import { withPrintAgentConnection } from "@/features/pos-print/lib/pos-agent-print";
import { printPosHtmlViaAgentOrBrowserFireAndForget } from "@/features/pos-print/lib/pos-agent-print";
import { buildCustomerCreditNoteReceiptHtml } from "@/features/customer-credit-notes/lib/customer-credit-note-receipt-print";

function creditNoteToTicketPayload(
  data: CustomerCreditNotePrintData,
  logoBase64: string | null,
): PosCustomerCreditNoteTicketPayload {
  const displayName =
    data.company.nombreFantasia?.trim() || data.company.razonSocial.trim();
  return {
    version: POS_CUSTOMER_CREDIT_NOTE_TICKET_PAYLOAD_VERSION,
    creditNoteFolio: data.creditNoteFolio.trim(),
    saleReturnFolio: data.saleReturnFolio.trim(),
    originalSaleFolio: data.originalSaleFolio.trim(),
    issuedAtIso: data.issuedAtIso,
    company: {
      razonSocial: data.company.razonSocial.trim() || displayName,
      nombreFantasia: data.company.nombreFantasia?.trim() || null,
      rut: data.company.rut?.trim() || null,
      businessActivity: data.company.businessActivity?.trim() || null,
      logoBase64,
    },
    branchName: data.pos.branchName?.trim() || null,
    pointOfSaleName: data.pos.pointOfSaleName?.trim() || null,
    customerName: data.customer?.name?.trim() || null,
    customerDocument: data.customer?.document?.trim() || null,
    lines: data.lines.map((l) => ({
      productName: l.productName,
      attributes: l.attributes ?? [],
      quantity: l.quantity,
      unitPriceWithTax: l.unitPriceWithTax,
      lineTotal: l.lineGross - l.discountAmount,
    })),
    totals: {
      subtotalNet: data.totals.subtotalNet,
      taxes: data.totals.taxes,
      discounts: data.totals.discounts,
      total: data.totals.total,
    },
    refundMode: data.refundMode,
    refundPayments: data.refundPayments,
  };
}

export async function printCustomerCreditNoteReceiptAgentOrBrowser(
  data: CustomerCreditNotePrintData,
): Promise<"agent-vector" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const folio = data.creditNoteFolio?.trim() || "nota-credito";
  const meta = {
    filename: `${folio}.pdf`,
    documentType: "CUSTOMER_CREDIT_NOTE",
    internalFolio: folio,
    iframeTitle: "Impresión nota de crédito",
  };

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    const html = buildCustomerCreditNoteReceiptHtml(data, window.location.origin);
    printPosHtmlViaAgentOrBrowserFireAndForget(html, "tickets", meta);
    return "browser";
  }

  const logoBase64 = await fetchReceiptLogoBase64(
    data.company.logoUrl,
    window.location.origin,
  );
  const ticket = creditNoteToTicketPayload(data, logoBase64);
  let escposMode = false;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello) => {
      escposMode = await agentTicketEscposEnabled(conn, "tickets");
      if (!agentSupportsPosCustomerCreditNoteTicket(hello)) {
        throw new Error("agent_no_pos_customer_credit_note_ticket");
      }
      const res = (await conn.enqueuePosCustomerCreditNoteTicket(ticket, {
        ...meta,
        sourceApp: "pwa-pos",
      })) as { jobId?: string; queued?: boolean };
      if (res && res.queued === false && !res.jobId) {
        throw new Error("enqueue_rejected");
      }
    });
    return "agent-vector";
  } catch (e) {
    if (escposMode) {
      console.warn(
        "[KaiStore print] nota de crédito: ESC/POS en KaiPrinters — no se usa PDF HTML de respaldo.",
        e,
      );
      return "agent-vector";
    }
    const html = buildCustomerCreditNoteReceiptHtml(data, window.location.origin);
    printPosHtmlViaAgentOrBrowserFireAndForget(html, "tickets", meta);
    return "browser";
  }
}

export function printCustomerCreditNoteReceiptAgentOrBrowserFireAndForget(
  data: CustomerCreditNotePrintData,
): void {
  void printCustomerCreditNoteReceiptAgentOrBrowser(data);
}
