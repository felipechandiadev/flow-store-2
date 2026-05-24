import {
  agentSupportsPosCashClosingTicket,
  getPosDocumentPrintMode,
  isPosAgentPrintConfiguredForPurpose,
  POS_CASH_CLOSING_TICKET_PAYLOAD_VERSION,
  type PosCashClosingTicketPayload,
} from "@flowstore/print-service-client";
import type { CashClosingPrintInput } from "@/features/cash-closing/lib/cash-closing-print.types";
import { buildCashClosingDocumentHtml } from "@/features/cash-closing/lib/cash-closing-document-print";
import { fetchReceiptLogoBase64 } from "@/features/pos-print/lib/pos-sale-ticket-agent";
import {
  printPosHtmlViaAgentOrBrowser,
  printPosHtmlViaAgentOrBrowserFireAndForget,
  enqueueVectorTicketWithMappingFallback,
  posTicketMetaToDocumentMeta,
  printPosTicketFailureDocumentFallback,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";

function arqueoPrintMeta(input: CashClosingPrintInput) {
  const ref = input.cashSessionId.slice(0, 8) || "arqueo";
  return {
    filename: `arqueo-${ref}.escpos`,
    iframeTitle: "Arqueo de caja",
    documentType: "CASH_SESSION_CLOSE",
    internalFolio: ref,
  };
}

function cashClosingToTicketPayload(
  input: CashClosingPrintInput,
  logoBase64: string | null,
): PosCashClosingTicketPayload {
  const c = input.company;
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  return {
    version: POS_CASH_CLOSING_TICKET_PAYLOAD_VERSION,
    cashSessionId: input.cashSessionId,
    sessionOpenedAt: input.sessionOpenedAt,
    closedAt: input.closedAt,
    company: {
      razonSocial: c?.razonSocial?.trim() || displayName,
      nombreFantasia: c?.nombreFantasia?.trim() || null,
      rut: c?.rut?.trim() || null,
      businessActivity: c?.businessActivity?.trim() || null,
      logoBase64,
    },
    branchName: input.branchName?.trim() || null,
    pointOfSaleName: input.pointOfSaleName?.trim() || null,
    operatorName: input.operatorName?.trim() || null,
    usedBlindCount: input.usedBlindCount,
    counted: {
      cash: input.counted.cash,
      debitCard: input.counted.debitCard,
      creditCard: input.counted.creditCard,
      transfer: input.counted.transfer,
      check: input.counted.check,
      other: input.counted.other,
    },
    countedGrand: input.countedGrand,
    systemCashExpected: input.systemCashExpected,
    difference: input.difference,
    salesTotal: input.salesTotal,
    notes: input.notes?.trim() || null,
    message: input.message?.trim() || null,
  };
}

async function printCashClosingTicketVector(
  input: CashClosingPrintInput,
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const meta = arqueoPrintMeta(input);
  const documentHtml = buildCashClosingDocumentHtml(input);
  const documentFallbackMeta = posTicketMetaToDocumentMeta(meta);

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    return printPosTicketFailureDocumentFallback(documentHtml, meta);
  }

  const logoBase64 = await fetchReceiptLogoBase64(
    input.company?.logoUrl,
    window.location.origin,
  );
  const ticket = cashClosingToTicketPayload(input, logoBase64);
  let enqueued = false;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello) => {
      if (!agentSupportsPosCashClosingTicket(hello)) {
        throw new Error("agent_no_pos_cash_closing_ticket");
      }
      enqueued = await enqueueVectorTicketWithMappingFallback(
        async () => {
          const res = (await conn.enqueuePosCashClosingTicket(ticket, {
            ...meta,
            sourceApp: "pwa-pos",
          })) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        async () => {
          const res = (await conn.enqueuePosCashClosingTicket(
            ticket,
            { ...meta, sourceApp: "pwa-pos" },
            true,
          )) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        {
          html: documentHtml,
          iframeTitle: documentFallbackMeta.iframeTitle,
          kind: "document",
        },
      );
    });
  } catch (e) {
    console.warn("[KaiStore print] arqueo agente:", e);
  }

  if (enqueued) return "agent";

  return printPosTicketFailureDocumentFallback(documentHtml, meta);
}

export function printCashClosingArqueo(input: CashClosingPrintInput): void {
  if (typeof window === "undefined") return;
  const mode = getPosDocumentPrintMode("cashClosing");
  const meta = arqueoPrintMeta(input);
  if (mode === "document") {
    printPosHtmlViaAgentOrBrowserFireAndForget(buildCashClosingDocumentHtml(input), "documents", meta);
    return;
  }
  void printCashClosingTicketVector(input);
}

export async function printCashClosingArqueoAwait(
  input: CashClosingPrintInput,
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";
  const mode = getPosDocumentPrintMode("cashClosing");
  const meta = arqueoPrintMeta(input);
  if (mode === "document") {
    return printPosHtmlViaAgentOrBrowser(buildCashClosingDocumentHtml(input), "documents", meta);
  }
  return printCashClosingTicketVector(input);
}
