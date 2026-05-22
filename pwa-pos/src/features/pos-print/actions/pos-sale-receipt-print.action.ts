"use server";

import { PosSaleReceiptPrintRequest } from "../infrastructure/pos-sale-receipt-print.request";

export async function getPosSaleReceiptPrintAction(transactionId: string) {
  return PosSaleReceiptPrintRequest.getByTransactionId(transactionId);
}
