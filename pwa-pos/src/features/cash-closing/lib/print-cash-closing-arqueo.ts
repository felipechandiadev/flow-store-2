import { getPosDocumentPrintMode } from "@flowstore/print-service-client";
import type { CashClosingPrintInput } from "@/features/cash-closing/lib/cash-closing-print.types";
import { buildCashClosingDocumentHtml } from "@/features/cash-closing/lib/cash-closing-document-print";
import { buildCashClosingReceiptHtml } from "@/features/cash-closing/lib/cash-closing-receipt-print";
import {
  printPosHtmlViaAgentOrBrowser,
  printPosHtmlViaAgentOrBrowserFireAndForget,
} from "@/features/pos-print/lib/pos-agent-print";

function arqueoPrintMeta(input: CashClosingPrintInput) {
  const ref = input.cashSessionId.slice(0, 8) || "arqueo";
  return {
    filename: `arqueo-${ref}.pdf`,
    iframeTitle: "Arqueo de caja",
    documentType: "CASH_SESSION_CLOSE",
    internalFolio: ref,
  };
}

export function printCashClosingArqueo(input: CashClosingPrintInput): void {
  if (typeof window === "undefined") return;
  const mode = getPosDocumentPrintMode("cashClosing");
  const meta = arqueoPrintMeta(input);
  if (mode === "document") {
    printPosHtmlViaAgentOrBrowserFireAndForget(buildCashClosingDocumentHtml(input), "documents", meta);
  } else {
    printPosHtmlViaAgentOrBrowserFireAndForget(
      buildCashClosingReceiptHtml(input, window.location.origin),
      "tickets",
      meta,
    );
  }
}

export async function printCashClosingArqueoAwait(input: CashClosingPrintInput): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";
  const mode = getPosDocumentPrintMode("cashClosing");
  const meta = arqueoPrintMeta(input);
  if (mode === "document") {
    return printPosHtmlViaAgentOrBrowser(buildCashClosingDocumentHtml(input), "documents", meta);
  }
  return printPosHtmlViaAgentOrBrowser(
    buildCashClosingReceiptHtml(input, window.location.origin),
    "tickets",
    meta,
  );
}

export function buildCashClosingArqueoPreviewHtml(input: CashClosingPrintInput): string | null {
  if (typeof window === "undefined") return null;
  const mode = getPosDocumentPrintMode("cashClosing");
  return mode === "document"
    ? buildCashClosingDocumentHtml(input)
    : buildCashClosingReceiptHtml(input, window.location.origin);
}
