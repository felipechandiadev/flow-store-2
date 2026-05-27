/**
 * Cobro / PAYMENT_IN → agente KaiPrinters (`type: "pos-payment-in-ticket"`).
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";

export const POS_PAYMENT_IN_TICKET_PAYLOAD_VERSION = 1;

export type PosPaymentInTicketPaymentRow = {
  label: string;
  amount: number;
  reference?: string | null;
};

export type PosPaymentInTicketAllocationRow = {
  documentNumber: string;
  amount: number;
};

export type PosPaymentInTicketPayload = {
  version: number;
  documentNumber: string;
  issuedAt: string;
  company: PosSaleTicketCompany;
  customerName?: string | null;
  customerDocument?: string | null;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  operatorName?: string | null;
  totalCollected: number;
  amountPaid: number;
  payments: PosPaymentInTicketPaymentRow[];
  allocations: PosPaymentInTicketAllocationRow[];
  notes?: string | null;
  externalReference?: string | null;
};

export type PosPaymentInTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
