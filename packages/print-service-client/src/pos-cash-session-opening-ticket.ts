/**
 * Apertura de caja POS → agente KaiPrinters (`type: "pos-cash-session-opening-ticket"`).
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";

export const POS_CASH_SESSION_OPENING_TICKET_PAYLOAD_VERSION = 1;

export type PosCashSessionOpeningTicketPayload = {
  version: number;
  cashSessionId: string;
  openedAt: string;
  openingAmount: number;
  company: PosSaleTicketCompany;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  operatorName?: string | null;
  cashHubName?: string | null;
};

export type PosCashSessionOpeningTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
