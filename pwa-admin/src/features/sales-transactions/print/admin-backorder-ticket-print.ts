import {
  agentSupportsPosSaleTicket,
  agentTicketEscposEnabled,
  type HelloResponseData,
  type PosSaleTicketPayload,
  type PosSaleTicketPrintExtras,
} from "@flowstore/print-service-client";
import type { PrintServiceConnection } from "@flowstore/print-service-client";
import {
  enqueueAdminPrint,
  isAdminPrintAgentConfigured,
  withAdminPrintAgentConnection,
} from "@/features/print/lib/admin-agent-print";
import type { SaleReceiptPrintData } from "./backorder-document-print.types";
import { mapSaleReceiptToPosSaleTicketPayload } from "./map-backorder-to-sale-ticket";

function isUnknownPrinterLabelError(e: unknown): boolean {
  return String(e).includes("unknown_printer_display_label");
}

async function enqueueBackorderTicketOnAgent(
  conn: PrintServiceConnection,
  ticket: PosSaleTicketPayload,
  meta: PosSaleTicketPrintExtras,
  omitDisplayLabel: boolean,
): Promise<void> {
  const body: Record<string, unknown> = {
    type: "pos-sale-ticket",
    ticket,
    filename: meta.filename,
    copies: 1,
    documentType: meta.documentType,
    internalFolio: meta.internalFolio,
  };
  if (omitDisplayLabel) {
    const res = (await conn.enqueuePrint({
      ...body,
      purpose: "tickets",
      sourceApp: "pwa-admin",
    })) as { jobId?: string; queued?: boolean };
    if (res && res.queued === false && !res.jobId) {
      throw new Error("enqueue_rejected");
    }
    return;
  }
  await enqueueAdminPrint(conn, "tickets", body);
}

/**
 * Encargo en ticket 80 mm vía agente (ESC/POS o PDF vectorial según KaiPrinters).
 */
export async function printAdminSaleTicket(
  data: SaleReceiptPrintData,
): Promise<"agent" | "skipped"> {
  if (typeof window === "undefined") return "skipped";

  if (!isAdminPrintAgentConfigured("tickets")) {
    console.warn(
      "[KaiStore admin print] Configure alias «Tickets» en Impresión local para imprimir en térmica.",
    );
    return "skipped";
  }

  const folio = data.folio.trim() || "ticket";
  const meta: PosSaleTicketPrintExtras = {
    filename: `${folio}.pdf`,
    documentType: data.documentKind === "backorder" ? "BACKORDER" : "SALE",
    internalFolio: folio,
  };
  const ticket = mapSaleReceiptToPosSaleTicketPayload(data);

  let escposMode = false;
  let enqueued = false;

  await withAdminPrintAgentConnection("tickets", async (conn, hello: HelloResponseData | null) => {
    escposMode = await agentTicketEscposEnabled(conn, "tickets");
    if (!agentSupportsPosSaleTicket(hello)) {
      console.warn(
        "[KaiStore admin print] Agente sin pos-sale-ticket — reinicie KaiPrinters.",
      );
      return;
    }
    try {
      await enqueueBackorderTicketOnAgent(conn, ticket, meta, false);
      enqueued = true;
      return;
    } catch (e) {
      if (!isUnknownPrinterLabelError(e)) {
        console.warn("[KaiStore admin print] pos-sale-ticket falló:", e);
        return;
      }
    }
    try {
      await enqueueBackorderTicketOnAgent(conn, ticket, meta, true);
      enqueued = true;
    } catch (e2) {
      console.warn("[KaiStore admin print] vector con/sin alias falló:", e2);
    }
  });

  if (enqueued) return "agent";

  if (escposMode) {
    console.warn(
      "[KaiStore admin print] ESC/POS activo: no se usa PDF rasterizado de respaldo.",
    );
  }

  return "skipped";
}
