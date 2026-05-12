"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button, Dialog } from "@/shared/admin-shared";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosPaymentLine, PosPaymentMethodId } from "@/features/pos-cart/pos-payment.types";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import type { PosContextV1 } from "@/features/session/lib/pos-context-storage";
import type { EffectivePaymentMethod } from "@/features/pos-payment-methods/types/effective-payment-method.types";
import type { AppliedSnapshot } from "@/features/promotions/lib/discount-engine.types";
import type { LoadedQuotationMeta } from "@/features/pos-cart/cart-storage";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";

const FALLBACK_METHOD_LABEL: Record<PosPaymentMethodId, string> = {
  CASH: "Efectivo",
  CREDIT_CARD: "Tarjeta crédito",
  DEBIT_CARD: "Tarjeta débito",
  TRANSFER: "Transferencia",
  CHECK: "Cheque",
};

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

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveReceiptLogoUrl(companyLogoUrl: string | null | undefined, origin: string): string {
  const appDefault = `${origin}/logo.png`;
  const raw = companyLogoUrl?.trim();
  if (!raw) return appDefault;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return raw;
}

export type PosSaleReceiptLine = {
  productName: string;
  attributes: string[];
  quantity: number;
  unitSymbol: string | null;
  unitPriceWithTax: number;
  lineGross: number;
  discountAmount: number;
  discountLabel: string | null;
};

export type PosSaleReceiptPayment = {
  label: string;
  amount: number;
  reference: string;
  detail: string | null;
};

export type PosSaleReceiptPromotion = {
  code: string;
  name: string;
  amount: number;
};

export type PosSaleReceiptData = {
  /** Folio interno de la venta (`documentNumber` de la transacción cuando existe). */
  folio: string;
  issuedAtIso: string;
  company: {
    razonSocial: string;
    nombreFantasia: string | null;
    rut: string | null;
    businessActivity: string | null;
    logoUrl: string | null;
  };
  pos: {
    pointOfSaleName: string | null;
    branchName: string | null;
    priceListLabel: string | null;
  };
  customer: PosSaleCustomer | null;
  quotation: LoadedQuotationMeta | null;
  lines: PosSaleReceiptLine[];
  promotions: PosSaleReceiptPromotion[];
  totals: {
    subtotalNet: number;
    subtotalGross: number;
    taxes: number;
    lineDiscounts: number;
    orderDiscount: number;
    discountsTotal: number;
    total: number;
    paid: number;
    change: number;
  };
  payments: PosSaleReceiptPayment[];
};

export type PosSaleReceiptSnapshotInput = {
  lines: PosCartLine[];
  payments: PosPaymentLine[];
  customer: PosSaleCustomer | null;
  company: CompanyDetails | null;
  posContext: PosContextV1 | null;
  appliedPromotions: AppliedSnapshot[];
  orderDiscount: number;
  lineDiscountsTotal: number;
  totals: {
    net: number;
    gross: number;
    taxes: number;
    discounts: number;
    saleTotal: number;
    appliedTotal: number;
    overpay: number;
  };
  methodsById: Map<string, EffectivePaymentMethod>;
  loadedQuotation: LoadedQuotationMeta | null;
  /** Si la venta ya se registró en backend, el folio/documento oficial (p. ej. `transaction.documentNumber`). */
  saleFolio?: string | null;
};

function paymentLabel(
  p: PosPaymentLine,
  methodsById: Map<string, EffectivePaymentMethod>,
): string {
  const cfg = p.companyPaymentMethodId ? methodsById.get(p.companyPaymentMethodId) : null;
  if (cfg?.label) return cfg.label;
  const t = p.type as PosPaymentMethodId;
  return FALLBACK_METHOD_LABEL[t] ?? String(p.type);
}

function bankLabelForKey(company: CompanyDetails | null, key: string | null | undefined): string | null {
  if (!key?.trim() || !company?.bankAccounts?.length) return null;
  const acc = company.bankAccounts.find((a) => (a.accountKey ?? "").trim() === key.trim());
  if (!acc) return null;
  return `${acc.bankName} · ${acc.accountType} · ${acc.accountNumber}`;
}

function paymentDetail(
  p: PosPaymentLine,
  company: CompanyDetails | null,
): string | null {
  const bits: string[] = [];
  if (p.type === "TRANSFER") {
    const bl = bankLabelForKey(company, p.bankAccountKey);
    if (bl) bits.push(bl);
  }
  if (p.type === "CHECK" && p.checkData) {
    const cd = p.checkData;
    const parts = [
      cd.checkNumber?.trim() ? `N° ${cd.checkNumber.trim()}` : "",
      cd.bankName?.trim() ? cd.bankName.trim() : "",
      cd.drawerName?.trim() ? `Librador: ${cd.drawerName.trim()}` : "",
      cd.dueDate?.trim() ? `Vence: ${cd.dueDate.trim()}` : "",
    ].filter(Boolean);
    if (parts.length) bits.push(parts.join(" · "));
  }
  if (p.reference?.trim()) bits.push(`Ref: ${p.reference.trim()}`);
  return bits.length ? bits.join(" | ") : null;
}

function priceListLabel(ctx: PosContextV1 | null): string | null {
  if (!ctx?.priceListId?.trim()) return null;
  const id = ctx.priceListId.trim();
  const lists = ctx.priceLists;
  if (Array.isArray(lists)) {
    const hit = lists.find((l) => l?.id === id);
    if (hit?.name?.trim()) return hit.name.trim();
  }
  return id;
}

export function buildPosSaleReceiptSnapshot(input: PosSaleReceiptSnapshotInput): PosSaleReceiptData {
  const provisionalFolio = `POS-${Date.now().toString(36).toUpperCase()}`;
  const folio = input.saleFolio?.trim() ? input.saleFolio.trim() : provisionalFolio;
  const issuedAtIso = new Date().toISOString();
  const c = input.company;

  const lines: PosSaleReceiptLine[] = input.lines.map((l) => {
    const q = Number(l.quantity) || 0;
    const gross = (Number(l.unitPriceWithTax) || 0) * q;
    const d = l.discount;
    const attrBits =
      l.attributes?.map((a) => String(a.attributeValue ?? "").trim()).filter(Boolean) ?? [];
    return {
      productName: l.productName,
      attributes: attrBits,
      quantity: q,
      unitSymbol: l.unitSymbol,
      unitPriceWithTax: Number(l.unitPriceWithTax) || 0,
      lineGross: gross,
      discountAmount: d?.discountAmount ?? 0,
      discountLabel:
        d && (d.promotionCode || d.promotionName)
          ? [d.promotionCode, d.promotionName].filter(Boolean).join(" · ")
          : null,
    };
  });

  const promotions: PosSaleReceiptPromotion[] = input.appliedPromotions.map((a) => ({
    code: a.promotionCode,
    name: a.promotionName,
    amount: a.amountDiscounted,
  }));

  const payments: PosSaleReceiptPayment[] = input.payments
    .filter((p) => (Number(p.amount) || 0) > 0)
    .map((p) => ({
      label: paymentLabel(p, input.methodsById),
      amount: p.amount,
      reference: p.reference?.trim() ?? "",
      detail: paymentDetail(p, input.company),
    }));

  return {
    folio,
    issuedAtIso,
    company: {
      razonSocial: c?.razonSocial?.trim() || "Empresa",
      nombreFantasia: c?.nombreFantasia?.trim() ? c.nombreFantasia.trim() : null,
      rut: c?.rut?.trim() ? c.rut.trim() : null,
      businessActivity: c?.businessActivity?.trim() ? c.businessActivity.trim() : null,
      logoUrl: c?.logoUrl?.trim() ? c.logoUrl.trim() : null,
    },
    pos: {
      pointOfSaleName: input.posContext?.pointOfSaleName?.trim() || null,
      branchName: input.posContext?.branchName?.trim() || null,
      priceListLabel: priceListLabel(input.posContext),
    },
    customer: input.customer,
    quotation: input.loadedQuotation,
    lines,
    promotions,
    totals: {
      subtotalNet: input.totals.net,
      subtotalGross: input.totals.gross,
      taxes: input.totals.taxes,
      lineDiscounts: input.lineDiscountsTotal,
      orderDiscount: input.orderDiscount,
      discountsTotal: input.totals.discounts,
      total: input.totals.saleTotal,
      paid: input.totals.appliedTotal,
      change: input.totals.overpay,
    },
    payments,
  };
}

export function buildPosSaleReceiptHtml(data: PosSaleReceiptData, origin: string): string {
  const logo = resolveReceiptLogoUrl(data.company.logoUrl, origin);
  const displayName = data.company.nombreFantasia || data.company.razonSocial;

  const lineRows = data.lines
    .map((l) => {
      const name = [l.productName, ...l.attributes].filter(Boolean).join(" · ");
      const unit = l.unitSymbol?.trim() ? ` ${l.unitSymbol.trim()}` : "";
      const qtyLine = `${l.quantity} × ${formatMoney(l.unitPriceWithTax)}${unit}`;
      const disc =
        l.discountAmount > 0.01
          ? `<div class="muted" style="margin-top:1px;">Desc.: ${escapeHtml(l.discountLabel || "Promo")} · −${formatMoney(l.discountAmount)}</div>`
          : "";
      return `<tr>
        <td class="name">${escapeHtml(name)}<div class="muted">${escapeHtml(qtyLine)}</div>${disc}</td>
        <td class="tright qty">${formatMoney(l.lineGross)}</td>
      </tr>`;
    })
    .join("");

  const promoRows =
    data.promotions.length > 0
      ? data.promotions
          .map(
            (p) =>
              `<div class="row"><span>${escapeHtml(p.code)} ${escapeHtml(p.name)}</span><span>−${formatMoney(p.amount)}</span></div>`,
          )
          .join("")
      : "";

  const payRows = data.payments
    .map((p) => {
      const det = p.detail ? `<div class="muted" style="margin-top:2px;">${escapeHtml(p.detail)}</div>` : "";
      return `<div class="row"><span>${escapeHtml(p.label)}</span><span>${formatMoney(p.amount)}</span></div>${det}`;
    })
    .join("");

  const cust = data.customer;
  const custBlock =
    cust && (cust.name?.trim() || cust.document?.trim() || cust.phone?.trim())
      ? `<div class="sep"></div>
         <div class="section-title">Cliente</div>
         ${cust.name?.trim() ? `<div class="row"><span>Nombre</span><span class="tright" style="max-width:48mm;text-align:right;">${escapeHtml(cust.name.trim())}</span></div>` : ""}
         ${cust.document?.trim() ? `<div class="row"><span>Documento</span><span>${escapeHtml(cust.document.trim())}</span></div>` : ""}
         ${cust.phone?.trim() ? `<div class="row"><span>Teléfono</span><span>${escapeHtml(cust.phone.trim())}</span></div>` : ""}
         ${cust.email?.trim() ? `<div class="row"><span>Email</span><span class="tright" style="max-width:48mm;word-break:break-all;text-align:right;">${escapeHtml(cust.email.trim())}</span></div>` : ""}`
      : "";

  const quot = data.quotation;
  const quotBlock =
    quot && quot.documentNumber?.trim()
      ? `<div class="sep"></div>
         <div class="section-title">Cotización origen</div>
         <div class="row"><span>Folio</span><span>${escapeHtml(quot.documentNumber.trim())}</span></div>
         ${quot.validUntil?.trim() ? `<div class="row"><span>Válida hasta</span><span>${escapeHtml(quot.validUntil.trim())}</span></div>` : ""}`
      : "";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Venta ${escapeHtml(data.folio)}</title>
<style>
  @page { size: 80mm auto; margin: 2mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, sans-serif; font-size: 11px; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .receipt { width: 72mm; max-width: 100%; margin: 0 auto; padding: 2mm 0; }
  .logo { display: block; max-width: 52mm; max-height: 24mm; margin: 0 auto 8px; object-fit: contain; }
  .store { font-size: 13px; font-weight: 700; text-align: center; margin: 0 0 2px; line-height: 1.2; }
  .legal { font-size: 10px; text-align: center; margin: 0; color: #333; }
  .muted { color: #555; font-size: 9px; }
  .center { text-align: center; }
  .row { display: flex; justify-content: space-between; gap: 6px; font-size: 10px; margin: 3px 0; align-items: flex-start; }
  .sep { border-top: 1px dashed #888; margin: 8px 0; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin: 6px 0 4px; color: #333; }
  table.lines { width: 100%; border-collapse: collapse; font-size: 10px; }
  table.lines td { vertical-align: top; padding: 4px 0; border-bottom: 1px dotted #ccc; }
  table.lines tr:last-child td { border-bottom: none; }
  .name { max-width: 46mm; word-wrap: break-word; }
  .qty { white-space: nowrap; width: 22mm; }
  .tright { text-align: right; }
  .tot { font-size: 11px; font-weight: 700; }
  .barcode-wrap { display: flex; justify-content: center; width: 100%; margin-top: 8px; }
  .barcode-wrap svg { max-width: 68mm; height: auto; }
</style></head><body>
<div class="receipt">
  <img class="logo" src="${escapeHtml(logo)}" alt="" />
  <p class="store">${escapeHtml(displayName)}</p>
  ${data.company.razonSocial && data.company.nombreFantasia ? `<p class="legal">${escapeHtml(data.company.razonSocial)}</p>` : ""}
  ${data.company.rut ? `<p class="legal">RUT: ${escapeHtml(data.company.rut)}</p>` : ""}
  ${data.company.businessActivity ? `<p class="legal">${escapeHtml(data.company.businessActivity)}</p>` : ""}
  <div class="sep"></div>
  <p class="center muted">Folio: ${escapeHtml(data.folio)}</p>
  <p class="center muted">${escapeHtml(formatDateTime(data.issuedAtIso))}</p>
  ${custBlock}
  ${quotBlock}
  <div class="sep"></div>
  <div class="section-title" style="text-transform:none">Detalle de Venta</div>
  <table class="lines" role="presentation">${lineRows}</table>
  ${promoRows ? `<div class="sep"></div><div class="section-title">Promociones</div>${promoRows}` : ""}
  <div class="sep"></div>
  <div class="row"><span>Subtotal neto</span><span>${formatMoney(data.totals.subtotalNet)}</span></div>
  <div class="row"><span>Impuestos</span><span>${formatMoney(data.totals.taxes)}</span></div>
  ${data.totals.lineDiscounts > 0.01 ? `<div class="row"><span>Descuentos línea</span><span>−${formatMoney(data.totals.lineDiscounts)}</span></div>` : ""}
  ${data.totals.orderDiscount > 0.01 ? `<div class="row"><span>Descuento orden</span><span>−${formatMoney(data.totals.orderDiscount)}</span></div>` : ""}
  <div class="row tot"><span>TOTAL</span><span>${formatMoney(data.totals.total)}</span></div>
  <div class="sep"></div>
  <div class="section-title">Pagos</div>
  ${payRows}
  ${data.totals.change > 0.01 ? `<div class="row"><span>Vuelto</span><span>${formatMoney(data.totals.change)}</span></div>` : ""}
  <div class="sep"></div>
  <p class="center muted" style="margin-top:10px;">Gracias por su compra</p>
  <div class="sep"></div>
  <div class="barcode-wrap">${receiptBarcodeSvgString(data.folio)}</div>
</div>
</body></html>`;
}

export function printPosSaleReceipt(data: PosSaleReceiptData): void {
  if (typeof window === "undefined") return;
  const origin = window.location.origin;
  const html = buildPosSaleReceiptHtml(data, origin);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Impresión ticket");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* ignore */
    } finally {
      setTimeout(cleanup, 1200);
    }
  }, 120);
}

type DialogProps = {
  open: boolean;
  data: PosSaleReceiptData | null;
  onClose: () => void;
};

/**
 * Tras confirmar la venta: vista previa tipo ticket 80 mm, impresión automática
 * y acción para reimprimir antes de volver al POS.
 */
export function PosSaleReceiptDialog({ open, data, onClose }: DialogProps) {
  const autoPrintForFolioRef = useRef<string | null>(null);

  const previewSrcDoc = useMemo(() => {
    if (!data || typeof window === "undefined") return null;
    return buildPosSaleReceiptHtml(data, window.location.origin);
  }, [data]);

  useEffect(() => {
    if (!open || !data) {
      autoPrintForFolioRef.current = null;
      return;
    }
    if (autoPrintForFolioRef.current === data.folio) return;
    autoPrintForFolioRef.current = data.folio;
    const t = window.setTimeout(() => {
      printPosSaleReceipt(data);
    }, 350);
    return () => clearTimeout(t);
  }, [open, data]);

  if (!data) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Venta registrada"
      size="lg"
      data-test-id="pos-payment-success-dialog"
      actions={
        <>
          <Button type="button" variant="outlined" onClick={() => printPosSaleReceipt(data)}>
            Imprimir de nuevo
          </Button>
          <Button type="button" variant="primary" onClick={onClose}>
            Volver al POS
          </Button>
        </>
      }
    >
      <div
        className="mx-auto max-h-[min(55vh,520px)] w-full max-w-[min(100%,420px)] overflow-auto rounded-lg border border-border bg-zinc-100 p-2 shadow-inner dark:bg-zinc-950"
        data-test-id="pos-sale-receipt-preview-wrap"
      >
        {previewSrcDoc ? (
          <iframe
            title="Vista previa ticket 80 mm"
            srcDoc={previewSrcDoc}
            className="mx-auto block min-h-[320px] w-[80mm] max-w-full border-0 bg-white"
            data-test-id="pos-sale-receipt-preview-iframe"
          />
        ) : (
          <p className="p-4 text-center text-sm text-muted-foreground">Preparando vista previa…</p>
        )}
      </div>
    </Dialog>
  );
}
