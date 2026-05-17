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
    token: cfg.token || undefined,
    clientId: "pwa-pos-print",
    appLabel: "KaiStore POS",
    requiredPurposes: [purpose],
    onHello: (d) => {
      hello = d;
    },
  });

  try {
    conn.connect();
    await conn.waitForOpen(8_000);
    reachedOpen = true;
    await new Promise((r) => globalThis.setTimeout(r, 450));
    return await fn(conn, hello);
  } finally {
    conn.disconnect({ ifConnecting: reachedOpen ? "default" : "abandon" });
  }
}

async function tryEnqueueOnAgent(
  html: string,
  purpose: PosPrintAgentPurpose,
  meta: PosAgentPrintMeta,
): Promise<void> {
  const base64 = await htmlToPdfBase64(html, purpose);

  await withPrintAgentConnection(purpose, async (conn) => {
    const res = (await conn.enqueuePosPrint({
      purpose,
      type: "pdf-base64",
      payload: base64,
      filename: meta.filename,
      copies: 1,
      sourceApp: "pwa-pos",
      documentType: meta.documentType,
      internalFolio: meta.internalFolio,
    })) as { jobId?: string; queued?: boolean };

    if (res && res.queued === false && !res.jobId) {
      throw new Error("enqueue_rejected");
    }
  });
}

/**
 * Si el POS tiene alias + agente conectado y propósito mapeado → envía PDF al agente (sin diálogo).
 * En cualquier otro caso → `window.print()` en iframe oculto.
 */
export async function printPosHtmlViaAgentOrBrowser(
  html: string,
  purpose: PosPrintAgentPurpose,
  meta: PosAgentPrintMeta,
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  if (!isPosAgentPrintConfiguredForPurpose(purpose)) {
    printHtmlInHiddenIframe(html, meta.iframeTitle);
    return "browser";
  }

  try {
    await tryEnqueueOnAgent(html, purpose, meta);
    return "agent";
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[pos-agent-print] fallback to browser print:", e);
    }
    printHtmlInHiddenIframe(html, meta.iframeTitle);
    return "browser";
  }
}

/** Dispara impresión agente o navegador sin bloquear al llamador. */
export function printPosHtmlViaAgentOrBrowserFireAndForget(
  html: string,
  purpose: PosPrintAgentPurpose,
  meta: PosAgentPrintMeta,
): void {
  void printPosHtmlViaAgentOrBrowser(html, purpose, meta);
}
