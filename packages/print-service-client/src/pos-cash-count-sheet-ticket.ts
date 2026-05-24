/**
 * Planilla de conteo POS → agente KaiPrinters (`type: "pos-cash-count-sheet-ticket"`).
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";

export const POS_CASH_COUNT_SHEET_TICKET_PAYLOAD_VERSION = 1;

export type PosCashCountSheetPaymentLine = {
  label: string;
};

export type PosCashCountSheetTicketPayload = {
  version: number;
  cashSessionId: string;
  sessionOpenedAt: string | null;
  printedAt: string;
  company: PosSaleTicketCompany;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  operatorName?: string | null;
  paymentLines: PosCashCountSheetPaymentLine[];
};

export type PosCashCountSheetTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
