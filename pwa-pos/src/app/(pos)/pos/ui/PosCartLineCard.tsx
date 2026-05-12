"use client";

import { useEffect, useMemo, useState } from "react";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import type { ResolvedLineDiscount } from "@/features/promotions/lib/discount-engine.types";
import { InlineSepDot, PosProductNameWithAttributes } from "@/features/pos-products/ui/posProductPreview";
import IconButton from "@/shared/components/IconButton/IconButton";
import { Alert, Button, Dialog, TextField } from "@/shared/admin-shared";

/**
 * Línea del carrito en el POS. `discount` es opcional y lo asigna el
 * motor de promociones (PR 4): cuando está presente, la línea muestra
 * el descuento aplicado y el cierre de venta lo persiste como
 * `TransactionLine.discountAmount`.
 */
export type PosCartLine = PosProductSearchItem & {
  quantity: number;
  discount?: ResolvedLineDiscount | null;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

export default function PosCartLineCard({
  line,
  onIncrement,
  onDecrement,
  onRemove,
  onSetQuantity,
}: {
  line: PosCartLine;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onSetQuantity: (nextQuantity: number) => void;
}) {
  const code = line.barcode?.trim() || line.sku?.trim() || "—";
  const stockLabel =
    line.trackInventory && line.availableStock != null ? String(line.availableStock) : "—";
  const allowDecimals = line.unitAllowDecimals === true;
  const [qtyDialogOpen, setQtyDialogOpen] = useState(false);
  const [qtyDraft, setQtyDraft] = useState("");
  const [qtyError, setQtyError] = useState<string | null>(null);

  useEffect(() => {
    if (!qtyDialogOpen) return;
    setQtyError(null);
    setQtyDraft(String(line.quantity ?? ""));
  }, [qtyDialogOpen, line.quantity]);

  const quantityLabel = useMemo(() => {
    if (allowDecimals) {
      return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(
        Number(line.quantity) || 0,
      );
    }
    return String(Math.max(0, Math.trunc(Number(line.quantity) || 0)));
  }, [allowDecimals, line.quantity]);

  const parseDraftQuantity = (): number | null => {
    const raw = qtyDraft.trim().replace(",", ".");
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (!allowDecimals && !Number.isInteger(n)) return null;
    return n;
  };

  const saveQty = () => {
    setQtyError(null);
    const n = parseDraftQuantity();
    if (n == null) {
      setQtyError(allowDecimals ? "Ingresa una cantidad válida." : "Ingresa una cantidad entera válida.");
      return;
    }
    onSetQuantity(n);
    setQtyDialogOpen(false);
  };

  const lineGross = (Number(line.unitPriceWithTax) || 0) * (Number(line.quantity) || 0);
  const lineDiscount = line.discount?.discountAmount ?? 0;
  const lineSubtotal = Math.max(0, lineGross - lineDiscount);

  return (
    <article
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      data-test-id="pos-cart-line"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-sm">
          <PosProductNameWithAttributes
            name={line.productName}
            attributes={line.attributes}
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          />
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] text-muted-foreground">
            <span>SKU {line.sku ?? "—"}</span>
            {code && code !== "—" ? (
              <>
                <InlineSepDot />
                <span>{code}</span>
              </>
            ) : null}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-1.5">
            <span className="font-medium text-foreground">
              {formatMoney(line.unitPriceWithTax)}
            </span>
            {line.unitSymbol ? (
              <>
                <InlineSepDot />
                <span className="text-xs text-muted-foreground">{line.unitSymbol}</span>
              </>
            ) : null}
            <InlineSepDot />
            <span className="font-mono text-[11px] text-muted-foreground">
              Stock sucursal:{" "}
              <span className="font-semibold text-foreground">{stockLabel}</span>
            </span>
          </div>
          {line.discount ? (
            <div
              className="mt-2 inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              data-test-id="pos-cart-line-discount-badge"
              title={`${line.discount.promotionCode}: -${formatMoney(line.discount.discountAmount)}`}
            >
              <span className="font-semibold">Promo</span>
              <span>{line.discount.promotionName}</span>
              <span className="tabular-nums">
                -{formatMoney(line.discount.discountAmount)}
              </span>
            </div>
          ) : null}
        </div>
        <div className="grid shrink-0 grid-cols-1 items-start gap-2">
          {/* Columna izquierda: subtotal + acciones */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Subtotal</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatMoney(Math.round(lineSubtotal))}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-1 py-0.5 dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  type="button"
                  className="rounded px-2 py-1 text-lg leading-none text-zinc-700 hover:bg-white dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={onDecrement}
                  aria-label="Disminuir cantidad"
                >
                  −
                </button>
                <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums">{quantityLabel}</span>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-lg leading-none text-zinc-700 hover:bg-white dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={onIncrement}
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
                <IconButton
                  icon="Pencil"
                  variant="basicSecondary"
                  size="xs"
                  ariaLabel="Editar cantidad"
                  title="Editar cantidad"
                  onClick={() => setQtyDialogOpen(true)}
                  data-test-id="pos-cart-line-edit-qty"
                />
              </div>
            </div>
            <IconButton
              icon="Trash2"
              variant="basicSecondary"
              size="sm"
              ariaLabel="Eliminar producto del carrito"
              title="Eliminar"
              onClick={onRemove}
              data-test-id="pos-cart-line-remove"
            />
          </div>
        </div>
      </div>

      <Dialog
        open={qtyDialogOpen}
        onClose={() => setQtyDialogOpen(false)}
        title="Editar cantidad"
        size="sm"
        alertArea={qtyError ? <Alert variant="error">{qtyError}</Alert> : undefined}
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setQtyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={saveQty}>
              Guardar
            </Button>
          </>
        }
        actionsJustify="between"
        data-test-id="pos-cart-line-edit-qty-dialog"
      >
        <div className="grid gap-3">
          <TextField
            label="Cantidad"
            name="pos-cart-edit-qty"
            type="number"
            value={qtyDraft}
            onChange={(e) => setQtyDraft(e.target.value)}
            placeholder="Cantidad"
            alwaysShowLabel
            min={allowDecimals ? 0.001 : 1}
            step={allowDecimals ? 0.001 : 1}
            inputMode={allowDecimals ? "decimal" : "numeric"}
            data-test-id="pos-cart-line-edit-qty-input"
          />
          <p className="text-xs text-muted-foreground">
            {allowDecimals
              ? "Esta unidad permite decimales."
              : "Esta unidad solo permite cantidades enteras."}
          </p>
        </div>
      </Dialog>
    </article>
  );
}
