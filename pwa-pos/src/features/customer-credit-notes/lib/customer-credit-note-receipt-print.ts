import type { CustomerCreditNotePrintData } from "../types/customer-credit-note-print.types";
import { printPosHtmlViaAgentOrBrowserFireAndForget } from "@/features/pos-print/lib/pos-agent-print";
import { thermalReceiptTicketBodyCss } from "@/features/pos-print/lib/thermal-receipt-ticket-styles";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function resolveReceiptLogoUrl(companyLogoUrl: string | null | undefined, origin: string): string {
  const appDefault = `${origin}/logo.png`;
  const raw = companyLogoUrl?.trim();
  if (!raw) return appDefault;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return raw;
}

export function buildCustomerCreditNoteReceiptHtml(data: CustomerCreditNotePrintData, origin: string): string {
  const logo = resolveReceiptLogoUrl(data.company.logoUrl, origin);
  const displayName = data.company.nombreFantasia?.trim() || data.company.razonSocial;
  const folio = data.creditNoteFolio;

  const lineRows = data.lines
    .map((l) => {
      const attr =
        l.attributes.length > 0
          ? `<div class="muted">${escapeHtml(l.attributes.join(" · "))}</div>`
          : "";
      const name = escapeHtml(l.productName);
      return `<tr>
        <td class="name">${name}${attr}
          <div class="muted">${l.quantity} × ${formatMoney(l.unitPriceWithTax)}</div>
        </td>
        <td class="tright">${formatMoney(l.lineGross - l.discountAmount)}</td>
      </tr>`;
    })
    .join("");

  const refundBlock =
    data.refundMode === "immediate" && data.refundPayments.length > 0
      ? `<div class="sep"></div>
         <div class="section-title">Reembolso en caja</div>
         ${data.refundPayments
           .map(
             (p) =>
               `<div class="row"><span>${escapeHtml(p.label)}</span><span class="tright">${formatMoney(p.amount)}</span></div>`,
           )
           .join("")}
         <p class="muted">Dinero entregado al cliente desde esta sesión de caja.</p>`
      : "";

  const cust = data.customer;
  const custBlock =
    cust?.name?.trim() || cust?.document?.trim()
      ? `<div class="sep"></div>
         <div class="section-title">Cliente</div>
         ${cust.name?.trim() ? `<div class="row"><span>Nombre</span><span class="tright">${escapeHtml(cust.name.trim())}</span></div>` : ""}
         ${cust.document?.trim() ? `<div class="row"><span>Documento</span><span>${escapeHtml(cust.document.trim())}</span></div>` : ""}`
      : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>NC ${escapeHtml(folio)}</title>
<style>${thermalReceiptTicketBodyCss()}</style></head><body>
<div class="logo"><img src="${escapeHtml(logo)}" alt=""/></div>
<h1>NOTA DE CRÉDITO</h1>
<div class="muted" style="text-align:center">${escapeHtml(displayName)}</div>
${data.company.rut ? `<div class="muted" style="text-align:center">RUT ${escapeHtml(data.company.rut)}</div>` : ""}
<div class="barcode">${receiptBarcodeSvgString(folio)}</div>
<div class="row"><span>Folio NC</span><span class="tright">${escapeHtml(folio)}</span></div>
<div class="row"><span>Fecha</span><span>${escapeHtml(formatDateTime(data.issuedAtIso))}</span></div>
<div class="sep"></div>
<div class="section-title">Referencias</div>
<div class="row"><span>Venta origen</span><span>${escapeHtml(data.originalSaleFolio)}</span></div>
<div class="row"><span>Devolución</span><span>${escapeHtml(data.saleReturnFolio)}</span></div>
${custBlock}
<div class="sep"></div>
<div class="section-title">Detalle devolución</div>
<table class="items"><tbody>${lineRows}</tbody></table>
<div class="sep"></div>
<div class="row"><span>Subtotal neto</span><span>${formatMoney(data.totals.subtotalNet)}</span></div>
<div class="row"><span>Impuestos</span><span>${formatMoney(data.totals.taxes)}</span></div>
<div class="row"><span>Descuentos</span><span>${formatMoney(data.totals.discounts)}</span></div>
${refundBlock}
<div class="row total-row"><span>Monto NC</span><span>${formatMoney(data.totals.total)}</span></div>
</body></html>`;
}

export function printCustomerCreditNoteReceipt(data: CustomerCreditNotePrintData): void {
  const html = buildCustomerCreditNoteReceiptHtml(data, window.location.origin);
  const folio = data.creditNoteFolio?.trim() || "nota-credito";
  printPosHtmlViaAgentOrBrowserFireAndForget(html, "tickets", {
    filename: `${folio}.pdf`,
    iframeTitle: "Impresión nota de crédito",
    documentType: "CUSTOMER_CREDIT_NOTE",
    internalFolio: folio,
  });
}
