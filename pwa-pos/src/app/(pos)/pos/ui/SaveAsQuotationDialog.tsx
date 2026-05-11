"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Dialog, TextField } from "@/shared/admin-shared";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { createQuotationPosAction } from "@/features/quotations/actions/quotations-pos.action";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    documentNumber: string;
    validUntil: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setCreated(null);
      setBusy(false);
      setNotes("");
      setValidityDays("15");
    }
  }, [open]);

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
    setCreated({
      documentNumber: res.quotation.documentNumber,
      validUntil: res.quotation.validUntil,
    });
  }

  function closeAndClear() {
    if (created) {
      cart.clear();
      onSaved?.();
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={closeAndClear}
      title="Guardar como cotización"
      size="sm"
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        created ? (
          <Button type="button" variant="primary" onClick={closeAndClear}>
            Volver al POS
          </Button>
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
      actionsJustify={created ? "end" : "between"}
      data-test-id="pos-save-quotation-dialog"
    >
      {created ? (
        <div className="grid gap-3 text-sm">
          <p>La cotización se generó correctamente.</p>
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="text-xs uppercase text-muted-foreground">Folio</div>
            <div className="font-mono text-base font-semibold">
              {created.documentNumber}
            </div>
            <div className="mt-2 text-xs uppercase text-muted-foreground">
              Vence
            </div>
            <div className="text-sm">
              {new Date(created.validUntil).toLocaleString("es-CL")}
            </div>
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
