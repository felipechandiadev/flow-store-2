/**
 * Ticket de venta POS → agente KaiPrinters (`type: "pos-sale-ticket"`).
 * Sin logo; el PDF se genera en el agente (vector, sin html2canvas).
 */

export const POS_SALE_TICKET_PAYLOAD_VERSION = 1;

export type PosSaleTicketDocumentKind = "sale" | "backorder";

export type PosSaleTicketCompany = {
  razonSocial: string;
  nombreFantasia: string | null;
  rut: string | null;
  businessActivity: string | null;
};

export type PosSaleTicketCustomer = {
  name?: string | null;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type PosSaleTicketQuotation = {
  documentNumber?: string | null;
  validUntil?: string | null;
};

export type PosSaleTicketLine = {
  productName: string;
  attributes: string[];
  quantity: number;
  unitSymbol: string | null;
  unitPriceWithTax: number;
  lineGross: number;
  discountAmount?: number;
  discountLabel?: string | null;
};

export type PosSaleTicketPromotion = {
  code: string;
  name: string;
  amount: number;
};

export type PosSaleTicketPayment = {
  label: string;
  amount: number;
  detail: string | null;
};

export type PosSaleTicketBackorder = {
  percent: number;
  depositAmount: number;
  orderTotal: number;
};

export type PosSaleTicketTotals = {
  subtotalNet: number;
  taxes: number;
  lineDiscounts: number;
  orderDiscount: number;
  total: number;
  change: number;
};

export type PosSaleTicketPayload = {
  version: typeof POS_SALE_TICKET_PAYLOAD_VERSION;
  folio: string;
  issuedAtIso: string;
  documentKind: PosSaleTicketDocumentKind;
  backorder?: PosSaleTicketBackorder | null;
  company: PosSaleTicketCompany;
  customer?: PosSaleTicketCustomer | null;
  quotation?: PosSaleTicketQuotation | null;
  lines: PosSaleTicketLine[];
  promotions: PosSaleTicketPromotion[];
  totals: PosSaleTicketTotals;
  payments: PosSaleTicketPayment[];
};

export type PosSaleTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
};
