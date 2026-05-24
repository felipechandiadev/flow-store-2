import type { PosDocumentPrintKind, PosDocumentPrintMode } from "@flowstore/print-service-client";
import { buildCustomerCreditNoteDocumentHtml } from "@/features/customer-credit-notes/lib/customer-credit-note-document-print";
import { printCustomerCreditNoteReceiptAgentOrBrowser } from "@/features/customer-credit-notes/lib/customer-credit-note-ticket-agent";
import { printCashCountSheetAwait } from "@/features/cash-closing/lib/cash-count-sheet-print";
import { printCashSessionOpeningAwait } from "@/features/cash-session-opening/lib/cash-session-opening-print";
import { buildCashSessionOpeningDocumentHtml } from "@/features/cash-session-opening/lib/cash-session-opening-print";
import { printCashClosingArqueoAwait } from "@/features/cash-closing/lib/cash-closing-ticket-agent";
import { printPosHtmlViaAgentOrBrowser } from "@/features/pos-print/lib/pos-agent-print";
import { printPosSaleDocumentAgentOrBrowser } from "@/features/pos-print/lib/pos-sale-document-print";
import {
  buildPosPrintTestCashClosingInput,
  buildPosPrintTestCashSessionOpeningInput,
  buildPosPrintTestCreditNoteData,
  buildPosPrintTestQuotationInput,
  buildPosPrintTestSaleReceipt,
} from "@/features/pos-print/lib/pos-print-test-fixtures";
import { printPosSaleTicketAgentOrBrowser } from "@/features/pos-print/lib/pos-sale-ticket-agent";
import { buildQuotationDocumentHtml } from "@/features/quotations/lib/quotation-document-print";
import { printPosQuotationReceiptAgentOrBrowser } from "@/features/quotations/lib/quotation-ticket-agent";

export type PosDocumentTestPrintChannel = "agent" | "browser";

/**
 * Imprime un documento de prueba (datos ficticios) según el modo ticket/documento
 * configurado en preferencias. KaiPrinters si hay alias; si no, diálogo del navegador.
 */
export async function printPosDocumentTest(
  kind: PosDocumentPrintKind,
  mode: PosDocumentPrintMode,
): Promise<PosDocumentTestPrintChannel> {
  switch (kind) {
    case "sale": {
      const data = buildPosPrintTestSaleReceipt("sale");
      const folio = data.folio.trim() || "ticket";
      if (mode === "document") {
        return printPosSaleDocumentAgentOrBrowser(data);
      }
      return printPosSaleTicketAgentOrBrowser(data, {
        filename: `${folio}.escpos`,
        documentType: "SALE",
        internalFolio: folio,
      });
    }
    case "backorder": {
      const data = buildPosPrintTestSaleReceipt("backorder");
      const folio = data.folio.trim() || "encargo";
      if (mode === "document") {
        return printPosSaleDocumentAgentOrBrowser(data);
      }
      return printPosSaleTicketAgentOrBrowser(data, {
        filename: `${folio}.escpos`,
        documentType: "BACKORDER",
        internalFolio: folio,
      });
    }
    case "quotation": {
      const input = buildPosPrintTestQuotationInput();
      const folio = input.quotation.documentNumber?.trim() || "cotizacion";
      if (mode === "document") {
        return printPosHtmlViaAgentOrBrowser(buildQuotationDocumentHtml(input), "documents", {
          filename: `${folio}.pdf`,
          iframeTitle: "Impresión cotización documento (prueba)",
          documentType: "QUOTATION",
          internalFolio: folio,
        });
      }
      return printPosQuotationReceiptAgentOrBrowser(input);
    }
    case "customerCreditNote": {
      const data = buildPosPrintTestCreditNoteData();
      const folio = data.creditNoteFolio.trim() || "nota-credito";
      if (mode === "document") {
        return printPosHtmlViaAgentOrBrowser(buildCustomerCreditNoteDocumentHtml(data), "documents", {
          filename: `${folio}.pdf`,
          iframeTitle: "Impresión nota de crédito documento (prueba)",
          documentType: "CUSTOMER_CREDIT_NOTE",
          internalFolio: folio,
        });
      }
      return printCustomerCreditNoteReceiptAgentOrBrowser(data);
    }
    case "cashClosing":
      return printCashClosingArqueoAwait(buildPosPrintTestCashClosingInput());
    case "cashCountSheet": {
      const input = buildPosPrintTestCashCountSheetInput();
      return printCashCountSheetAwait(input);
    }
    case "cashSessionOpening": {
      const input = buildPosPrintTestCashSessionOpeningInput();
      const ref = input.cashSessionId.slice(0, 8).toUpperCase() || "apertura";
      if (mode === "document") {
        return printPosHtmlViaAgentOrBrowser(buildCashSessionOpeningDocumentHtml(input), "documents", {
          filename: `apertura-caja-${ref}.pdf`,
          iframeTitle: "Apertura de caja (prueba)",
          documentType: "CASH_SESSION_OPEN",
          internalFolio: ref,
        });
      }
      return printCashSessionOpeningAwait(input);
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
