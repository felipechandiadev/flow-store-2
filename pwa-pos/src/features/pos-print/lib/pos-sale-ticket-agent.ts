import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import {
  agentSupportsPosSaleTicket,
  agentTicketEscposEnabled,
  isPosAgentPrintConfiguredForPurpose,
  POS_SALE_TICKET_PAYLOAD_VERSION,
  PrintServiceConnection,
  type HelloResponseData,
  type PosSaleTicketPayload,
  type PosSaleTicketPrintExtras,
} from "@flowstore/print-service-client";
import { buildPosSaleReceiptHtml } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import { htmlToPdfBase64 } from "@/features/pos-print/lib/html-to-pdf-base64";
import {
  enqueueVectorTicketWithMappingFallback,
  isUnknownPrinterLabelError,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";
import { printHtmlInHiddenIframe } from "@/features/pos-print/lib/print-html-in-hidden-iframe";

const LOG = "[KaiStore print]";

function logPath(path: string, detail?: string) {
  const msg = detail ? `${LOG} ticket → ${path} (${detail})` : `${LOG} ticket → ${path}`;
  console.warn(msg);
}

function resolveReceiptLogoUrl(logoUrl: string | null | undefined, origin: string): string {
  const appDefault = `${origin}/logo.png`;
  const raw = logoUrl?.trim();
  if (!raw) return appDefault;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return raw;
}

/** Descarga el logo del comprobante y lo codifica para el PDF vectorial del agente. */
export async function fetchReceiptLogoBase64(
  logoUrl: string | null | undefined,
  origin: string,
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const url = resolveReceiptLogoUrl(logoUrl, origin);
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

export function posSaleReceiptToTicketPayload(
  data: PosSaleReceiptData,
  options?: { logoBase64?: string | null },
): PosSaleTicketPayload {
  const displayName = data.company.nombreFantasia?.trim() || data.company.razonSocial.trim();
  return {
    version: POS_SALE_TICKET_PAYLOAD_VERSION,
    folio: data.folio.trim(),
    issuedAtIso: data.issuedAtIso,
    documentKind: data.documentKind === "backorder" ? "backorder" : "sale",
    backorder: data.backorder ?? null,
    company: {
      razonSocial: data.company.razonSocial.trim() || displayName,
      nombreFantasia: data.company.nombreFantasia?.trim() || null,
      rut: data.company.rut?.trim() || null,
      businessActivity: data.company.businessActivity?.trim() || null,
      logoBase64: options?.logoBase64 ?? null,
    },
    customer: data.customer
      ? {
          name: data.customer.name ?? null,
          document: data.customer.document ?? null,
          phone: data.customer.phone ?? null,
          email: data.customer.email ?? null,
        }
      : null,
    quotation: data.quotation
      ? {
          documentNumber: data.quotation.documentNumber ?? null,
          validUntil: data.quotation.validUntil ?? null,
        }
      : null,
    lines: data.lines.map((l) => ({
      productName: l.productName,
      attributes: l.attributes ?? [],
      quantity: l.quantity,
      unitSymbol: l.unitSymbol,
      unitPriceWithTax: l.unitPriceWithTax,
      lineGross: l.lineGross,
      discountAmount: l.discountAmount,
      discountLabel: l.discountLabel,
    })),
    promotions: data.promotions.map((p) => ({
      code: p.code,
      name: p.name,
      amount: p.amount,
    })),
    totals: {
      subtotalNet: data.totals.subtotalNet,
      taxes: data.totals.taxes,
      lineDiscounts: data.totals.lineDiscounts,
      orderDiscount: data.totals.orderDiscount,
      total: data.totals.total,
      change: data.totals.change,
    },
    payments: data.payments.map((p) => ({
      label: p.label,
      amount: p.amount,
      detail: p.detail,
    })),
  };
}

async function assertQueued(res: unknown): Promise<void> {
  const r = res as { jobId?: string; queued?: boolean };
  if (r && r.queued === false && !r.jobId) {
    throw new Error("enqueue_rejected");
  }
}

async function tryEnqueueSaleTicketVector(
  conn: PrintServiceConnection,
  ticket: PosSaleTicketPayload,
  meta: PosSaleTicketPrintExtras,
  escposMode: boolean,
): Promise<boolean> {
  const ok = await enqueueVectorTicketWithMappingFallback(
    escposMode,
    () => enqueueSaleTicketOnAgent(conn, ticket, meta, false),
    () => enqueueSaleTicketOnAgent(conn, ticket, meta, true),
  );
  if (ok) logPath("agent-vector", "pos-sale-ticket");
  else console.warn(`${LOG} pos-sale-ticket: alias y mapeo por propósito fallaron`);
  return ok;
}

async function enqueueSaleTicketOnAgent(
  conn: PrintServiceConnection,
  ticket: PosSaleTicketPayload,
  meta: PosSaleTicketPrintExtras,
  omitDisplayLabel: boolean,
): Promise<void> {
  const res = await conn.enqueuePosSaleTicket(ticket, meta, omitDisplayLabel);
  await assertQueued(res);
}

async function enqueueSaleTicketPdfOnAgent(
  conn: PrintServiceConnection,
  data: PosSaleReceiptData,
  meta: PosSaleTicketPrintExtras,
  omitDisplayLabel: boolean,
): Promise<void> {
  const html = buildPosSaleReceiptHtml(data, window.location.origin);
  const base64 = await htmlToPdfBase64(html, "tickets");
  const body: Record<string, unknown> = {
    purpose: "tickets",
    type: "pdf-base64",
    payload: base64,
    filename: meta.filename,
    copies: 1,
    sourceApp: "pwa-pos",
    documentType: meta.documentType,
    internalFolio: meta.internalFolio,
  };
  const res = omitDisplayLabel
    ? await conn.enqueuePrint(body)
    : await conn.enqueuePosPrint(body);
  await assertQueued(res);
}

/**
 * Ticket de venta: agente genera ESC/POS o PDF vectorial (`pos-sale-ticket`).
 * Si ESC/POS está activo en KaiPrinters, no se encola PDF rasterizado de respaldo.
 */
export type PosSaleTicketPrintChannel =
  | "agent-vector"
  | "agent-raster"
  | "browser"
  | "agent-unavailable";

export async function printPosSaleTicketAgentOrBrowser(
  data: PosSaleReceiptData,
  meta: PosSaleTicketPrintExtras,
): Promise<PosSaleTicketPrintChannel> {
  if (typeof window === "undefined") return "browser";

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    logPath("browser", "sin alias Tickets en Impresión local");
    const html = buildPosSaleReceiptHtml(data, window.location.origin);
    printHtmlInHiddenIframe(html, "Impresión ticket");
    return "browser";
  }

  const logoBase64 = await fetchReceiptLogoBase64(
    data.company.logoUrl,
    window.location.origin,
  );
  const ticketVector = posSaleReceiptToTicketPayload(data, { logoBase64 });
  let result: PosSaleTicketPrintChannel = "browser";
  let skipBrowserFallback = false;
  let lastAgentError = "";

  await withPrintAgentConnection("tickets", async (conn, hello: HelloResponseData | null) => {
    const escposMode = await agentTicketEscposEnabled(conn, "tickets");
    const vectorOk = agentSupportsPosSaleTicket(hello);

    if (!hello) {
      lastAgentError = "sin respuesta hello del agente (timeout)";
      console.warn(`${LOG} ${lastAgentError}`);
    }

    if (vectorOk) {
      const enqueued = await tryEnqueueSaleTicketVector(
        conn,
        ticketVector,
        meta,
        escposMode,
      );
      if (enqueued) {
        result = "agent-vector";
        return;
      }
      lastAgentError =
        "no se pudo encolar pos-sale-ticket (revise alias Tickets = displayLabel en KaiPrinters)";
    } else {
      lastAgentError = "agente sin capacidad pos-sale-ticket";
      console.warn(`${LOG} ${lastAgentError} — reinicie KaiPrinters.`);
    }

    if (escposMode) {
      skipBrowserFallback = true;
      result = "agent-unavailable";
      console.warn(
        `${LOG} ESC/POS activo en KaiPrinters pero el ticket no se encoló. ${lastAgentError}`,
      );
      return;
    }

    try {
      await enqueueSaleTicketPdfOnAgent(conn, data, meta, false);
      logPath("agent-raster", "pdf-base64 / html2canvas");
      result = "agent-raster";
      return;
    } catch (e) {
      if (isUnknownPrinterLabelError(e)) {
        try {
          await enqueueSaleTicketPdfOnAgent(conn, data, meta, true);
          logPath("agent-raster", "pdf-base64 sin alias");
          result = "agent-raster";
          return;
        } catch (e2) {
          console.warn(`${LOG} raster falló:`, e2);
        }
      } else {
        console.warn(`${LOG} raster falló:`, e);
      }
    }
  });

  if (result === "agent-unavailable") {
    console.warn(`${LOG} impresión en agente fallida; no se abre diálogo del navegador.`);
    return result;
  }

  if (result === "browser" && !skipBrowserFallback) {
    logPath("browser", "fallback final");
    const html = buildPosSaleReceiptHtml(data, window.location.origin);
    printHtmlInHiddenIframe(html, "Impresión ticket");
  }

  return result;
}

export function printPosSaleTicketAgentOrBrowserFireAndForget(
  data: PosSaleReceiptData,
  meta: PosSaleTicketPrintExtras,
): void {
  void printPosSaleTicketAgentOrBrowser(data, meta);
}
