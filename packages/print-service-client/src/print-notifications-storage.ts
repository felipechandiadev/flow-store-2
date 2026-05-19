import type { PrintServiceNotification, PrintServiceNotificationKind } from "./core";

const LS_PREFIX = "flowstore:print-service-notifications:";
const MAX_STORED = 30;

export function printServiceNotificationsStorageKey(clientId: string): string {
  return `${LS_PREFIX}${clientId || "pwa"}`;
}

function isNotificationKind(value: unknown): value is PrintServiceNotificationKind {
  return value === "disconnected" || value === "job_failed";
}

function parseStoredItem(raw: unknown): PrintServiceNotification | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.at !== "number" || typeof o.message !== "string") {
    return null;
  }
  if (!isNotificationKind(o.kind)) return null;
  return {
    id: o.id,
    at: o.at,
    kind: o.kind,
    level: "error",
    message: o.message,
    read: Boolean(o.read),
  };
}

export function readPrintServiceNotificationsFromStorage(clientId: string): PrintServiceNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(printServiceNotificationsStorageKey(clientId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseStoredItem)
      .filter((n): n is PrintServiceNotification => n !== null)
      .slice(0, MAX_STORED);
  } catch {
    return [];
  }
}

export function writePrintServiceNotificationsToStorage(
  clientId: string,
  items: PrintServiceNotification[],
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      printServiceNotificationsStorageKey(clientId),
      JSON.stringify(items.slice(0, MAX_STORED)),
    );
  } catch {
    /* quota or private mode */
  }
}

export function clearPrintServiceNotificationsStorage(clientId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(printServiceNotificationsStorageKey(clientId));
  } catch {
    /* ignore */
  }
}

/** Mensaje fijo para desconexión del agente (único tipo «disconnected»). */
export const PRINT_SERVICE_DISCONNECTED_MESSAGE = "KaiPrinters no está conectado.";

export function formatPrintJobFailedMessage(error: string): string {
  const detail = (error || "error desconocido").trim();
  const short = detail.length > 120 ? `${detail.slice(0, 117)}…` : detail;
  return `Error al imprimir: ${short}`;
}
