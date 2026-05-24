import {
  PrintServiceConnection,
  buildWebSocketUrl,
  isAdminAgentPrintConfiguredForPurpose,
  mergeAdminPrinterDisplayLabelForPurposeIntoPrintExtras,
  printServicePageRequiresTls,
  readPrintServiceConfigFromStorage,
  type HelloResponseData,
} from "@flowstore/print-service-client";

export type AdminAgentPrintPurpose = "tickets" | "documents" | "labels";

export type AdminAgentPrintMeta = {
  filename: string;
  iframeTitle: string;
  documentType?: string;
  internalFolio?: string;
};

function buildAgentWebSocketUrl(): string {
  const cfg = readPrintServiceConfigFromStorage();
  const tls = printServicePageRequiresTls() || cfg.useTls;
  const port = tls ? cfg.wssPort : cfg.port;
  return buildWebSocketUrl(cfg.host, port, tls);
}

export async function withAdminPrintAgentConnection<T>(
  purpose: AdminAgentPrintPurpose,
  fn: (conn: PrintServiceConnection, hello: HelloResponseData | null) => Promise<T>,
): Promise<T> {
  let hello: HelloResponseData | null = null;
  let reachedOpen = false;

  const conn = new PrintServiceConnection({
    url: buildAgentWebSocketUrl(),
    clientId: "pwa-admin-print",
    appLabel: "KaiStore Administración",
    requiredPurposes: [purpose],
    onHello: (d) => {
      hello = d;
    },
  });

  try {
    conn.connect();
    await conn.waitForOpen(8_000);
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

export async function enqueueAdminPrint(
  conn: PrintServiceConnection,
  purpose: AdminAgentPrintPurpose,
  body: Record<string, unknown>,
): Promise<void> {
  const res = (await conn.enqueuePrint(
    mergeAdminPrinterDisplayLabelForPurposeIntoPrintExtras(purpose, {
      ...body,
      purpose,
      sourceApp: body.sourceApp ?? "pwa-admin",
    }),
  )) as { jobId?: string; queued?: boolean };
  if (res && res.queued === false && !res.jobId) {
    throw new Error("enqueue_rejected");
  }
}

export function isAdminPrintAgentConfigured(purpose: AdminAgentPrintPurpose): boolean {
  return isAdminAgentPrintConfiguredForPurpose(purpose);
}
