import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";
import type { CashSessionListItem } from "../types/cash-session.types";

export type ListOpenCashSessionsResult =
  | { success: true; items: CashSessionListItem[] }
  | { success: false; error: string };

export class ListOpenCashSessionsUseCase {
  static async execute(): Promise<ListOpenCashSessionsResult> {
    const res = await CashSessionsRequest.listOpen();
    if (!res?.success) {
      return { success: false, error: res?.message || "No se pudieron cargar las sesiones de caja" };
    }
    return { success: true, items: res.items ?? [] };
  }
}
