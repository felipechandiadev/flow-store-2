"use server";

import { PosBackorderFulfillRequest } from "../infrastructure/pos-backorder-fulfill.request";

export async function findBackorderForFulfillPosAction(documentNumber: string) {
  return PosBackorderFulfillRequest.findByDocumentNumber(documentNumber);
}
