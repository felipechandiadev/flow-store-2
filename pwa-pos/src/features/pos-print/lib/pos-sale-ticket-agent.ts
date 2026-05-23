import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import {
  agentSupportsPosSaleTicket,
  isPosAgentPrintConfiguredForPurpose,
  POS_SALE_TICKET_PAYLOAD_VERSION,
  PrintServiceConnection,
  type HelloResponseData,
  type PosSaleTicketPayload,
  type PosSaleTicketPrintExtras,
} from "@flowstore/print-service-client";
import { buildPosSaleReceiptHtml } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import {
  enqueueVectorTicketWithMappingFallback,
  printTicketHtmlInBrowser,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";

const LOG = "[KaiStore print]";

function resolveReceiptLogoUrl(logoUrl: string | null | undefined, origin: string): string {
  const appDefault = `${origin}/logo.png`;
  const raw = logoUrl?.trim();
  if (!raw) return appDefault;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return raw;
}

/** Descarga el logo del comprobante y lo codifica para ESC/POS en el agente. */
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

async function enqueueSaleTicketOnAgent(
  conn: PrintServiceConnection,
  ticket: PosSaleTicketPayload,
  meta: PosSaleTicketPrintExtras,
  omitDisplayLabel: boolean,
): Promise<void> {
  const res = await conn.enqueuePosSaleTicket(ticket, meta, omitDisplayLabel);
  await assertQueued(res);
}

/** Ticket de venta: agente ESC/POS (`pos-sale-ticket`) o diálogo del navegador. */
export type PosSaleTicketPrintChannel = "agent" | "browser";

export async function printPosSaleTicketAgentOrBrowser(
  data: PosSaleReceiptData,
  meta: PosSaleTicketPrintExtras,
): Promise<PosSaleTicketPrintChannel> {
  if (typeof window === "undefined") return "browser";

  const html = buildPosSaleReceiptHtml(data, window.location.origin);
  const iframeTitle = "Impresión ticket";

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    console.warn(`${LOG} sin alias Tickets → navegador`);
    printTicketHtmlInBrowser(html, iframeTitle);
    return "browser";
  }

  const logoBase64 = await fetchReceiptLogoBase64(
    data.company.logoUrl,
    window.location.origin,
  );
  const ticketVector = posSaleReceiptToTicketPayload(data, { logoBase64 });
  let enqueued = false;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello: HelloResponseData | null) => {
      if (!agentSupportsPosSaleTicket(hello)) {
        throw new Error("agent_no_pos_sale_ticket");
      }
      enqueued = await enqueueVectorTicketWithMappingFallback(
        () => enqueueSaleTicketOnAgent(conn, ticketVector, meta, false),
        () => enqueueSaleTicketOnAgent(conn, ticketVector, meta, true),
      );
    });
  } catch (e) {
    console.warn(`${LOG} agente no disponible o encolado falló:`, e);
  }

  if (enqueued) {
    console.warn(`${LOG} ticket → agente ESC/POS`);
    return "agent";
  }

  console.warn(`${LOG} ticket → navegador`);
  printTicketHtmlInBrowser(html, iframeTitle);
  return "browser";
}

export function printPosSaleTicketAgentOrBrowserFireAndForget(
  data: PosSaleReceiptData,
  meta: PosSaleTicketPrintExtras,
): void {
  void printPosSaleTicketAgentOrBrowser(data, meta);
}
