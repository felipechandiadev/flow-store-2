"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Dialog, TextField } from "@/shared/admin-shared";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { findQuotationByDocumentPosAction } from "@/features/quotations/actions/quotations-pos.action";
import type { QuotationDetail } from "@/features/quotations/types/quotation.types";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";

type Props = {
  open: boolean;
  onClose: () => void;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Convierte líneas de cotización a `PosCartLine`. Como las cotizaciones
 * almacenan snapshots de productos pero no atributos visuales del POS
 * (imagen, stock disponible, etc.), la línea cargada queda con campos
 * mínimos y `unitPriceWithTax` recalculado desde el snapshot. Esto es
 * suficiente para mostrarlas en el carrito y emitir la venta resultante.
 */
function quotationLinesToCart(detail: QuotationDetail): PosCartLine[] {
  return detail.lines.map((l) => ({
    productId: l.productId ?? "",
    productName: l.productName,
    productDescription: null,
    productImageUrl: null,
    variantId: l.productVariantId ?? l.id,
    sku: l.productSku ?? null,
    barcode: null,
    unitAllowDecimals: false,
    unitSymbol: null,
    unitId: null,
    unitPrice: Number(l.unitPrice) || 0,
    unitTaxRate: Number(l.taxRate) || 0,
    unitTaxAmount: Number(l.taxAmount) || 0,
    unitPriceWithTax:
      Number(l.quantity) > 0 ? Number(l.total) / Number(l.quantity) : Number(l.unitPrice) || 0,
    trackInventory: false,
    availableStock: null,
    availableStockBase: null,
    attributes: [],
    metadata: null,
    quantity: Number(l.quantity) || 1,
  }));
}

export function LoadQuotationDialog({ open, onClose }: Props) {
  const cart = usePosCart();
  const [folio, setFolio] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<QuotationDetail | null>(null);

  useEffect(() => {
    if (!open) {
      setFolio("");
      setError(null);
      setPreview(null);
      setBusy(false);
    }
  }, [open]);

  async function handleSearch() {
    setError(null);
    setPreview(null);
    const folioTrim = folio.trim();
    if (!folioTrim) {
      setError("Ingrese un folio (ej. COT-26-00001).");
      return;
    }
    setBusy(true);
    const res = await findQuotationByDocumentPosAction(folioTrim);
    setBusy(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    if (!res.quotation) {
      setError("No se encontró ninguna cotización con ese folio.");
      return;
    }
    setPreview(res.quotation);
  }

  function handleLoad() {
    if (!preview) return;
    if (
      preview.effectiveStatus === "CONVERTED" ||
      preview.effectiveStatus === "CANCELLED"
    ) {
      setError(
        preview.effectiveStatus === "CONVERTED"
          ? "Esta cotización ya fue convertida en venta."
          : "Esta cotización fue anulada.",
      );
      return;
    }
    const lines = quotationLinesToCart(preview);
    cart.replaceLines(lines);
    if (preview.customerName) {
      cart.setSaleCustomer({
        customerId: preview.customerId,
        name: preview.customerName,
        document: preview.customerDocument ?? "",
        phone: "",
      });
    }
    cart.setLoadedQuotation({
      id: preview.id,
      documentNumber: preview.documentNumber,
      validUntil: preview.validUntil,
      expired: preview.effectiveStatus === "EXPIRED",
    });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cargar cotización en el POS"
      size="md"
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        <>
          <Button
            type="button"
            variant="outlined"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </Button>
          {preview ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleLoad}
              data-test-id="pos-load-quotation-confirm"
            >
              Cargar al carrito
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSearch}
              loading={busy}
              disabled={busy}
              data-test-id="pos-load-quotation-search"
            >
              Buscar
            </Button>
          )}
        </>
      }
      actionsJustify="end"
      data-test-id="pos-load-quotation-dialog"
    >
      <div className="grid gap-3">
        <TextField
          label="Folio de cotización"
          placeholder="COT-26-00001"
          value={folio}
          onChange={(e) =>
            setFolio((e as React.ChangeEvent<HTMLInputElement>).target.value)
          }
          data-test-id="pos-load-quotation-folio"
        />

        {preview ? (
          <div className="rounded-lg border border-border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Folio</span>
              <span className="font-mono font-semibold">
                {preview.documentNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado</span>
              <span className="font-medium">{preview.effectiveStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span>{preview.customerName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">
                {formatMoney(Number(preview.total))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vence</span>
              <span>{formatDateTime(preview.validUntil)}</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Líneas: {preview.lines.length}
            </div>
            {preview.effectiveStatus === "EXPIRED" ? (
              <p className="mt-2 text-xs text-warning">
                La cotización está vencida. Al cargarla se respetan los
                precios cotizados; en la venta final se solicitará override.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
