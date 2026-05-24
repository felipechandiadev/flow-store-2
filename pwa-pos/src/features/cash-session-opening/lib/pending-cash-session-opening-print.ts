import type { CashSessionOpeningPrintInput } from "@/features/cash-session-opening/lib/cash-session-opening-print.types";

const STORAGE_KEY = "flowstore.pendingCashSessionOpeningPrint";

/** Datos para imprimir tras llegar al POS (sin `company`; se resuelve allí). */
export type PendingCashSessionOpeningPrint = Omit<CashSessionOpeningPrintInput, "company">;

export function queueCashSessionOpeningPrint(pending: PendingCashSessionOpeningPrint): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    /* quota / private mode */
  }
}

export function peekPendingCashSessionOpeningPrint(): PendingCashSessionOpeningPrint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingCashSessionOpeningPrint;
  } catch {
    return null;
  }
}

export function consumePendingCashSessionOpeningPrint(): PendingCashSessionOpeningPrint | null {
  const pending = peekPendingCashSessionOpeningPrint();
  if (!pending) return null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return pending;
}
