"use server";

import { FindMyOpenCashSessionUseCase } from "../application/find-my-open-cash-session.usecase";
import { ListOpenCashSessionsUseCase } from "../application/list-open-cash-sessions.usecase";

export async function findMyOpenCashSessionAction() {
  return FindMyOpenCashSessionUseCase.execute();
}

export async function listOpenCashSessionsAction() {
  return ListOpenCashSessionsUseCase.execute();
}

