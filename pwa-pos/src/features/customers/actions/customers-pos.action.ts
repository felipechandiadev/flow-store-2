"use server";

import type { PosCreateCustomerInput } from "../types/pos-customer-create.types";
import { CustomersPosRequest } from "../infrastructure/customers-pos.request";

export async function searchPosCustomersAction(input: { query?: string; page?: number; pageSize?: number }) {
  return CustomersPosRequest.search(input);
}

export async function getCustomerPosDetailBundleAction(customerId: string) {
  return CustomersPosRequest.getCustomerDetailBundle(customerId);
}

export async function createPosCustomerAction(input: PosCreateCustomerInput) {
  return CustomersPosRequest.create(input);
}
