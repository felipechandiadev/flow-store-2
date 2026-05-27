"use server";

import type { PosCreateCustomerInput } from "../types/pos-customer-create.types";
import { CustomersPosRequest } from "../infrastructure/customers-pos.request";

export async function searchPosCustomersAction(input: {
  query?: string;
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
}) {
  return CustomersPosRequest.search(input);
}

export async function getCustomerPosDetailBundleAction(customerId: string) {
  return CustomersPosRequest.getCustomerDetailBundle(customerId);
}

export async function getCustomerPosPaymentSourcesAction(customerId: string) {
  return CustomersPosRequest.getPosPaymentSources(customerId);
}

export async function getBackorderDetailPosAction(transactionId: string) {
  return CustomersPosRequest.getBackorderDetail({ transactionId });
}

export async function createPosCustomerAction(input: PosCreateCustomerInput) {
  return CustomersPosRequest.create(input);
}
