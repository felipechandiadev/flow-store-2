"use server";

import { CustomersPosRequest } from "../infrastructure/customers-pos.request";

export async function searchPosCustomersAction(input: { query?: string; page?: number; pageSize?: number }) {
  return CustomersPosRequest.search(input);
}
