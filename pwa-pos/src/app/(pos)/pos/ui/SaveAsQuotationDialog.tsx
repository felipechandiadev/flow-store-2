"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Dialog, TextField } from "@/shared/admin-shared";
import { DocumentPrintModeToggle } from "@/features/pos-print/ui/DocumentPrintModeToggle";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { createQuotationPosAction } from "@/features/quotations/actions/quotations-pos.action";
import {
  buildQuotationDocumentHtml,
  printPosQuotationDocument,
} from "@/features/quotations/lib/quotation-document-print";
import {
  buildQuotationReceiptHtml,
  printPosQuotationReceipt,
  type QuotationReceiptPrintInput,
} from "@/features/quotations/lib/quotation-receipt-print";
import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import { getPosDocumentPrintMode } from "@flowstore/print-service-client";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

type QuotationPrintMode = "ticket" | "document";

type SavedQuotationPrintState = {
  input: QuotationReceiptPrintInput;
  printMode: QuotationPrintMode;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function SaveAsQuotationDialog({ open, onClose, onSaved }: Props) {
  const cart = usePosCart();
  const [validityDays, setValidityDays] = useState("15");
  const [notes, setNotes] = useState("");
  const [printMode, setPrintMode] = useState<QuotationPrintMode>("ticket");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Datos listos para imprimir / vista previa (mismo payload que la impresora). */
  const [savedPrint, setSavedPrint] = useState<SavedQuotationPrintState | null>(null);
  const printedQuotationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      const id = window.setTimeout(() => {
        setError(null);
        setSavedPrint(null);
        setBusy(false);
        setNotes("");
        setValidityDays("15");
        setPrintMode("ticket");
        printedQuotationIdRef.current = null;
      }, 0);
      return () => clearTimeout(id);
    }
    setPrintMode(getPosDocumentPrintMode("quotation"));
  }, [open]);

  useEffect(() => {
    const input = savedPrint?.input;
    const mode = savedPrint?.printMode;
    const q = input?.quotation;
    if (!input || !q?.id || !mode) return;
    if (printedQuotationIdRef.current === q.id) return;
    printedQuotationIdRef.current = q.id;
    const t = window.setTimeout(() => {
      if (mode === "document") {
        printPosQuotationDocument(input);
      } else {
        printPosQuotationReceipt(input);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [savedPrint]);

  const previewSrcDoc = useMemo(() => {
    if (!savedPrint || typeof window === "undefined") return null;
    const origin = window.location.origin;
    return savedPrint.printMode === "document"
      ? buildQuotationDocumentHtml(savedPrint.input)
      : buildQuotationReceiptHtml(savedPrint.input, origin);
  }, [savedPrint]);

  const totals = cart.lines.reduce(
    (acc, l) => {
      const q = Number(l.quantity) || 0;
      const net = (Number(l.unitPrice) || 0) * q;
      const gross = (Number(l.unitPriceWithTax) || 0) * q;
      acc.net += net;
      acc.gross += gross;
      return acc;
    },
    { net: 0, gross: 0 },
  );

  async function handleSave() {
    setError(null);
    if (cart.lines.length === 0) {
      setError("El carrito está vacío.");
      return;
    }
    if (!cart.saleCustomer?.customerId?.trim()) {
      setError("Selecciona un cliente antes de guardar la cotización.");
      return;
    }
    const ctx = readPosContextClient();
    const branchId = ctx?.branchId?.trim();
    if (!branchId) {
      setError("No se pudo determinar la sucursal del punto de venta.");
      return;
    }

    let validUntil: string | undefined;
    const days = Math.max(1, parseInt(validityDays, 10) || 0);
    if (days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(23, 59, 59, 999);
      validUntil = d.toISOString();
    }

    const customer = cart.saleCustomer;
    setBusy(true);
    const res = await createQuotationPosAction({
      branchId,
      pointOfSaleId: ctx?.pointOfSaleId ?? undefined,
      priceListId: ctx?.priceListId ?? undefined,
      customerId: customer?.customerId ?? undefined,
      customerName: customer?.name ?? undefined,
      customerDocument: customer?.document ?? undefined,
      customerPhone: customer?.phone ?? undefined,
      validUntil,
      notes: notes.trim() || undefined,
      currency: "CLP",
      lines: cart.lines.map((l) => {
        const quantity = Number(l.quantity) || 0;
        const unitPrice = Number(l.unitPrice) || 0;
        const unitPriceWithTax = Number(l.unitPriceWithTax) || unitPrice;
        const taxRate = Number(l.unitTaxRate) || 0;
        const subtotal = Number((unitPrice * quantity).toFixed(2));
        const total = Number((unitPriceWithTax * quantity).toFixed(2));
        const taxAmount = Number(Math.max(0, total - subtotal).toFixed(2));
        return {
          productId: l.productId ?? undefined,
          productVariantId: l.variantId,
          unitId: l.unitId ?? undefined,
          productName: l.productName,
          productSku: l.sku ?? undefined,
          quantity,
          unitPrice,
          taxRate,
          taxAmount,
          subtotal,
          total,
        };
      }),
    });
    setBusy(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    const company = await getCompanyDetailsAction();
    const ctxAfter = readPosContextClient();
    setSavedPrint({
      input: {
        quotation: res.quotation,
        company,
        branchName: ctxAfter?.branchName ?? null,
        pointOfSaleName: ctxAfter?.pointOfSaleName ?? null,
      },
      printMode,
    });
  }

  function closeAndClear() {
    if (savedPrint) {
      cart.clear();
      onSaved?.();
    }
    onClose();
  }

  function handleReprint() {
    if (!savedPrint) return;
    if (savedPrint.printMode === "document") {
      printPosQuotationDocument(savedPrint.input);
    } else {
      printPosQuotationReceipt(savedPrint.input);
    }
  }

  const q = savedPrint?.input.quotation;

  return (
    <Dialog
      open={open}
      onClose={closeAndClear}
      title="Guardar como cotización"
      size={savedPrint ? "lg" : "sm"}
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        savedPrint ? (
          <>
            <Button type="button" variant="outlined" onClick={handleReprint}>
              Imprimir de nuevo
            </Button>
            <Button type="button" variant="primary" onClick={closeAndClear}>
              Volver al POS
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outlined"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              loading={busy}
              disabled={busy || cart.lines.length === 0}
            >
              Emitir cotización
            </Button>
          </>
        )
      }
      actionsJustify="between"
      data-test-id="pos-save-quotation-dialog"
    >
      {savedPrint && q ? (
        <div className="grid gap-3 text-sm">
          <p>La cotización se generó correctamente.</p>
          <p className="text-xs text-muted-foreground">
            Formato de impresión:{" "}
            <span className="font-medium text-foreground">
              {savedPrint.printMode === "document" ? "Documento (hoja)" : "Ticket (80 mm)"}
            </span>
            .
          </p>
          <div
            className={`mx-auto max-h-[min(55vh,520px)] w-full overflow-auto rounded-lg border border-border bg-transparent p-2 ${
              savedPrint.printMode === "document"
                ? "max-w-[min(100%,720px)]"
                : "max-w-[min(100%,420px)]"
            }`}
            data-test-id="pos-save-quotation-receipt-preview-wrap"
          >
            {previewSrcDoc ? (
              <iframe
                title={
                  savedPrint.printMode === "document"
                    ? "Vista previa cotización documento"
                    : "Vista previa cotización 80 mm"
                }
                srcDoc={previewSrcDoc}
                className={`mx-auto block border-0 bg-white ${
                  savedPrint.printMode === "document"
                    ? "min-h-[480px] w-full max-w-[210mm]"
                    : "min-h-[320px] w-[80mm] max-w-full"
                }`}
                data-test-id="pos-save-quotation-receipt-preview-iframe"
              />
            ) : (
              <p className="p-4 text-center text-muted-foreground">Preparando vista previa…</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Los precios cotizados serán respetados al convertir esta cotización
            en venta, durante el período de vigencia, incluso si las listas de
            precios cambian.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="rounded-lg border border-border bg-background p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ítems</span>
              <span className="font-medium">{cart.itemsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">
                {formatMoney(totals.gross)}
              </span>
            </div>
            {cart.saleCustomer ? (
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{cart.saleCustomer.name}</span>
              </div>
            ) : null}
          </div>
          <DocumentPrintModeToggle
            value={printMode}
            onChange={setPrintMode}
            data-test-id="pos-save-quotation-print-mode"
          />
          <TextField
            label="Vigencia (días)"
            type="number"
            min={1}
            max={365}
            value={validityDays}
            onChange={(e) =>
              setValidityDays(
                (e as React.ChangeEvent<HTMLInputElement>).target.value,
              )
            }
            data-test-id="pos-save-quotation-days"
          />
          <TextField
            label="Notas (opcional)"
            type="textarea"
            rows={4}
            value={notes}
            onChange={(e) =>
              setNotes(
                (e as React.ChangeEvent<HTMLTextAreaElement>).target.value,
              )
            }
            data-test-id="pos-save-quotation-notes"
          />
        </div>
      )}
    </Dialog>
  );
}
