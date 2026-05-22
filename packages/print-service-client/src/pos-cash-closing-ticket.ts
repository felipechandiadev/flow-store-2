/**
 * Arqueo de caja POS → agente KaiPrinters (`type: "pos-cash-closing-ticket"`).
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";

export const POS_CASH_CLOSING_TICKET_PAYLOAD_VERSION = 1;

export type PosCashClosingCounted = {
  cash: number;
  debitCard: number;
  creditCard: number;
  transfer: number;
  check: number;
  other: number;
};

export type PosCashClosingTicketPayload = {
  version: number;
  cashSessionId: string;
  sessionOpenedAt: string | null;
  closedAt: string;
  company: PosSaleTicketCompany;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  operatorName?: string | null;
  usedBlindCount: boolean;
  counted: PosCashClosingCounted;
  countedGrand: number;
  systemCashExpected?: number;
  difference?: number;
  salesTotal?: number;
  notes?: string | null;
  message?: string | null;
};

export type PosCashClosingTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
