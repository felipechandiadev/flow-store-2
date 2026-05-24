import { printHtmlInHiddenIframe } from "@/features/pos-print/lib/print-html-in-hidden-iframe";

export type PosPrintJobBrowserFallback = {
  html: string;
  iframeTitle: string;
  /** Solo formato documento (hoja); nunca ticket 80 mm en navegador. */
  kind?: "document";
};

const MAX_ENTRIES = 32;
const TTL_MS = 15 * 60 * 1000;

type Entry = PosPrintJobBrowserFallback & { registeredAt: number };

const registry = new Map<string, Entry>();

export function extractPrintEnqueueJobId(res: unknown): string | null {
  if (!res || typeof res !== "object") return null;
  const id = (res as { jobId?: string }).jobId?.trim();
  return id || null;
}

export function registerPosPrintJobBrowserFallback(
  jobId: string,
  fallback: PosPrintJobBrowserFallback,
): void {
  const id = jobId.trim();
  if (!id || typeof window === "undefined") return;
  if (registry.size >= MAX_ENTRIES) {
    const oldest = registry.keys().next().value;
    if (oldest) registry.delete(oldest);
  }
  registry.set(id, { ...fallback, registeredAt: Date.now() });
}

export function registerPosPrintJobBrowserFallbackFromEnqueue(
  res: unknown,
  fallback: PosPrintJobBrowserFallback,
): void {
  const jobId = extractPrintEnqueueJobId(res);
  if (jobId) registerPosPrintJobBrowserFallback(jobId, fallback);
}

export function clearPosPrintJobBrowserFallback(jobId: string): void {
  registry.delete(jobId.trim());
}

/** Errores de entrega a impresora (red/TCP) donde conviene reintentar en el navegador. */
export function isAgentPrinterDeliveryError(error: string): boolean {
  const e = (error || "").toLowerCase();
  if (!e) return false;
  return (
    e.includes("no hay conexión tcp") ||
    e.includes("no route to host") ||
    e.includes("connection refused") ||
    e.includes("connection timed out") ||
    e.includes("timed out") ||
    e.includes("network is unreachable") ||
    e.includes("host is down") ||
    e.includes("host unreachable") ||
    e.includes("econnrefused") ||
    e.includes("enetunreach") ||
    e.includes(":9100")
  );
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [id, entry] of registry) {
    if (now - entry.registeredAt > TTL_MS) registry.delete(id);
  }
}

function openBrowserFallback(entry: PosPrintJobBrowserFallback): void {
  const title = entry.iframeTitle.trim() || "Impresión";
  printHtmlInHiddenIframe(entry.html, title);
}

/**
 * Si el trabajo falló por conectividad con la impresora, abre el diálogo del navegador
 * con el HTML guardado al encolar. Devuelve `true` si se aplicó el fallback.
 */
export function tryPosPrintJobBrowserFallback(jobId: string, error: string): boolean {
  if (typeof window === "undefined") return false;
  pruneExpired();
  const id = jobId.trim();
  if (!id || !isAgentPrinterDeliveryError(error)) return false;

  const entry = registry.get(id);
  registry.delete(id);
  if (!entry) return false;

  console.warn(
    "[KaiStore print] impresora no alcanzable; abriendo diálogo del navegador:",
    error.slice(0, 160),
  );
  openBrowserFallback(entry);
  return true;
}
