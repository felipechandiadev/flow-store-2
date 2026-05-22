import { getPosDocumentPrintMode } from "@flowstore/print-service-client";
import type { CashClosingPrintInput } from "@/features/cash-closing/lib/cash-closing-print.types";
import { buildCashClosingDocumentHtml } from "@/features/cash-closing/lib/cash-closing-document-print";
import { buildCashClosingReceiptHtml } from "@/features/cash-closing/lib/cash-closing-receipt-print";
import {
  printCashClosingArqueo,
  printCashClosingArqueoAwait,
} from "@/features/cash-closing/lib/cash-closing-ticket-agent";

export { printCashClosingArqueo, printCashClosingArqueoAwait };

export function buildCashClosingArqueoPreviewHtml(input: CashClosingPrintInput): string | null {
  if (typeof window === "undefined") return null;
  const mode = getPosDocumentPrintMode("cashClosing");
  return mode === "document"
    ? buildCashClosingDocumentHtml(input)
    : buildCashClosingReceiptHtml(input, window.location.origin);
}
