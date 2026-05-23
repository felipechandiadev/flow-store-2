import {
  PrintServiceConnection,
  buildWebSocketUrl,
  isPosAgentPrintConfiguredForPurpose,
  printServicePageRequiresTls,
  readPrintServiceConfigFromStorage,
  type HelloResponseData,
  type PosPrintAgentPurpose,
} from "@flowstore/print-service-client";
import { htmlToPdfBase64 } from "@/features/pos-print/lib/html-to-pdf-base64";
import { printHtmlInHiddenIframe } from "@/features/pos-print/lib/print-html-in-hidden-iframe";

export type PosAgentPrintMeta = {
  filename: string;
  iframeTitle: string;
  documentType?: string;
  internalFolio?: string;
};

export function isUnknownPrinterLabelError(e: unknown): boolean {
  return String(e).includes("unknown_printer_display_label");
}

/** Tickets: primero mapeo por propósito (sin alias), luego con alias del POS. */
export async function enqueueVectorTicketWithMappingFallback(
  withAlias: () => Promise<void>,
  withoutAlias: () => Promise<void>,
): Promise<boolean> {
  for (const attempt of [withoutAlias, withAlias]) {
    try {
      await attempt();
      return true;
    } catch (e) {
      if (!isUnknownPrinterLabelError(e)) {
        console.warn("[KaiStore print] enqueue vector:", e);
        return false;
      }
    }
  }
  return false;
}

export function printTicketHtmlInBrowser(html: string, title: string): void {
  printHtmlInHiddenIframe(html, title);
}

export function buildAgentWebSocketUrl(): string {
  const cfg = readPrintServiceConfigFromStorage();
  const tls = printServicePageRequiresTls() || cfg.useTls;
  const port = tls ? cfg.wssPort : cfg.port;
  return buildWebSocketUrl(cfg.host, port, tls);
}

export async function withPrintAgentConnection<T>(
  purpose: PosPrintAgentPurpose,
  fn: (conn: PrintServiceConnection, hello: HelloResponseData | null) => Promise<T>,
): Promise<T> {
  const cfg = readPrintServiceConfigFromStorage();
  let hello: HelloResponseData | null = null;
  let reachedOpen = false;

  const conn = new PrintServiceConnection({
    url: buildAgentWebSocketUrl(),
    clientId: "pwa-pos-print",
    appLabel: "KaiStore POS",
    requiredPurposes: [purpose],
    onHello: (d) => {
      hello = d;
    },
  });

  try {
    conn.connect();
    await conn.waitForOpen(12_000);
    reachedOpen = true;
    try {
      hello = await conn.waitForHello(6_000);
    } catch {
      hello = null;
    }
    return await fn(conn, hello);
  } finally {
    conn.disconnect({ ifConnecting: reachedOpen ? "default" : "abandon" });
  }
}

async function tryEnqueueDocumentPdfOnAgent(
  html: string,
  purpose: PosPrintAgentPurpose,
  meta: PosAgentPrintMeta,
): Promise<void> {
  if (purpose === "tickets") {
    throw new Error("tickets_no_pdf");
  }
  const base64 = await htmlToPdfBase64(html, purpose);

  await withPrintAgentConnection(purpose, async (conn) => {
    const baseBody = {
      purpose,
      type: "pdf-base64",
      payload: base64,
      filename: meta.filename,
      copies: 1,
      sourceApp: "pwa-pos",
      documentType: meta.documentType,
      internalFolio: meta.internalFolio,
    };
    let res: { jobId?: string; queued?: boolean };
    try {
      res = (await conn.enqueuePosPrint(baseBody)) as { jobId?: string; queued?: boolean };
    } catch (e) {
      if (!isUnknownPrinterLabelError(e)) throw e;
      res = (await conn.enqueuePrint(baseBody)) as { jobId?: string; queued?: boolean };
    }
    if (res && res.queued === false && !res.jobId) {
      throw new Error("enqueue_rejected");
    }
  });
}

/**
 * Documentos: PDF al agente si hay alias; tickets: solo diálogo del navegador (HTML).
 */
export async function printPosHtmlViaAgentOrBrowser(
  html: string,
  purpose: PosPrintAgentPurpose,
  meta: PosAgentPrintMeta,
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  if (purpose === "tickets") {
    printTicketHtmlInBrowser(html, meta.iframeTitle);
    return "browser";
  }

  if (!isPosAgentPrintConfiguredForPurpose(purpose)) {
    printHtmlInHiddenIframe(html, meta.iframeTitle);
    return "browser";
  }

  try {
    await tryEnqueueDocumentPdfOnAgent(html, purpose, meta);
    return "agent";
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[pos-agent-print] fallback to browser print:", e);
    }
    printHtmlInHiddenIframe(html, meta.iframeTitle);
    return "browser";
  }
}

export function printPosHtmlViaAgentOrBrowserFireAndForget(
  html: string,
  purpose: PosPrintAgentPurpose,
  meta: PosAgentPrintMeta,
): void {
  void printPosHtmlViaAgentOrBrowser(html, purpose, meta);
}
