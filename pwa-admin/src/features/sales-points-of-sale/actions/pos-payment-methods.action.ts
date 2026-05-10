"use server";

import { revalidatePath } from "next/cache";
import { PosPaymentMethodsRequest } from "../infrastructure/pos-payment-methods.request";
import type { PosPaymentMethodConfig } from "../types/pos-payment-methods.types";

export async function getPosPaymentMethodsAction(posId: string) {
  return PosPaymentMethodsRequest.list(posId);
}

export async function replacePosPaymentMethodsAction(
  posId: string,
  paymentMethods: PosPaymentMethodConfig[],
) {
  const res = await PosPaymentMethodsRequest.replace(posId, paymentMethods);
  if (res.success) {
    revalidatePath("/sales/points-of-sale");
  }
  return res;
}

export async function getEffectivePaymentMethodsForPosAction(
  pointOfSaleId: string,
) {
  return PosPaymentMethodsRequest.getEffectiveForMe(pointOfSaleId);
}
