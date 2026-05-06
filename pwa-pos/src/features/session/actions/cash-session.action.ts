"use server";

import { FindMyOpenCashSessionUseCase } from "../application/find-my-open-cash-session.usecase";

export async function findMyOpenCashSessionAction() {
  return FindMyOpenCashSessionUseCase.execute();
}

