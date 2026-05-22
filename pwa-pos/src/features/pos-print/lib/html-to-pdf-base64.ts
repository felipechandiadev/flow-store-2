import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { PosPrintAgentPurpose } from "@flowstore/print-service-client";
import {
  THERMAL_TICKET_AGENT_CONTENT_WIDTH_MM,
  THERMAL_TICKET_AGENT_LEFT_INSET_MM,
  THERMAL_TICKET_PAGE_WIDTH_MM,
  THERMAL_TICKET_PDF_EXTRA_FEED_MM,
  THERMAL_TICKET_RECEIPT_WIDTH_MM,
} from "@/features/pos-print/lib/thermal-receipt-ticket-styles";

const DOCUMENT_WIDTH_PX = 794;
const TICKET_CANVAS_SCALE = 3;

function mmToPx(mm: number): number {
  return Math.round((mm / 25.4) * 96);
}

/** Iframe = ancho exacto del ticket (evita pixels extra que desplazan el contenido). */
const TICKET_IFRAME_WIDTH_PX = mmToPx(THERMAL_TICKET_RECEIPT_WIDTH_MM);

async function waitForIframeLoad(iframe: HTMLIFrameElement, html: string): Promise<Document> {
  await new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error("iframe_load_failed"));
    iframe.srcdoc = html;
  });
  return iframe.contentDocument!;
}

async function waitForTicketRender(doc: Document): Promise<void> {
  const view = doc.defaultView;
  try {
    await view?.document.fonts?.ready;
  } catch {
    /* ignore */
  }
  await Promise.all(
    Array.from(doc.images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  );
  await new Promise((r) => globalThis.setTimeout(r, 280));
}

function ticketCaptureTarget(doc: Document): HTMLElement {
  return doc.querySelector<HTMLElement>(".receipt") ?? doc.body;
}

/**
 * HTML → PDF base64 para KaiPrinters.
 * Tickets: 72 mm de contenido, margen izquierdo mínimo, feed extra al final del PDF.
 */
export async function htmlToPdfBase64(
  html: string,
  format: PosPrintAgentPurpose,
): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("browser_only");
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "pdf-render");
  const widthPx = format === "tickets" ? TICKET_IFRAME_WIDTH_PX : DOCUMENT_WIDTH_PX;
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-12000px",
    top: "0",
    width: `${widthPx}px`,
    border: "none",
    visibility: "hidden",
  });
  document.body.appendChild(iframe);

  try {
    const doc = await waitForIframeLoad(iframe, html);
    if (!doc.body) throw new Error("iframe_body_missing");

    if (format === "tickets") {
      await waitForTicketRender(doc);
    } else {
      await new Promise((r) => globalThis.setTimeout(r, 180));
    }

    const target = format === "tickets" ? ticketCaptureTarget(doc) : doc.body;

    const canvas = await html2canvas(target, {
      scale: format === "tickets" ? TICKET_CANVAS_SCALE : 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: target.scrollWidth,
      height: target.scrollHeight,
      windowWidth: target.scrollWidth,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
    });

    const imageType = format === "tickets" ? "image/png" : "image/jpeg";
    const imageQuality = format === "tickets" ? undefined : 0.92;
    const imgData = canvas.toDataURL(imageType, imageQuality);
    const pdfImageFormat = format === "tickets" ? "PNG" : "JPEG";

    let pdf: jsPDF;
    if (format === "tickets") {
      const pageWidthMm = THERMAL_TICKET_PAGE_WIDTH_MM;
      const contentWidthMm = THERMAL_TICKET_AGENT_CONTENT_WIDTH_MM;
      const leftInsetMm = THERMAL_TICKET_AGENT_LEFT_INSET_MM;
      const extraFeedMm = THERMAL_TICKET_PDF_EXTRA_FEED_MM;

      const contentHeightMm = Math.max(
        36,
        (canvas.height / canvas.width) * contentWidthMm,
      );
      const pageHeightMm = contentHeightMm + extraFeedMm;

      pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pageWidthMm, pageHeightMm],
        compress: true,
      });
      pdf.addImage(
        imgData,
        pdfImageFormat,
        leftInsetMm,
        0,
        contentWidthMm,
        contentHeightMm,
        undefined,
        "FAST",
      );
    } else {
      pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height / canvas.width) * pageW;
      if (imgH <= pageH) {
        pdf.addImage(imgData, pdfImageFormat, 0, 0, pageW, imgH);
      } else {
        const customH = Math.min(imgH, 400);
        pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [pageW, customH] });
        pdf.addImage(imgData, pdfImageFormat, 0, 0, pageW, customH);
      }
    }

    const dataUri = pdf.output("datauristring");
    const comma = dataUri.indexOf(",");
    const base64 = comma >= 0 ? dataUri.slice(comma + 1) : "";
    if (!base64) throw new Error("pdf_base64_empty");
    return base64;
  } finally {
    iframe.remove();
  }
}
