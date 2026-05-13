"use client";

import { useEffect, useState } from "react";
import Dialog from "@/shared/components/Dialog";
import { Button } from "@/shared/components/Button";
import Alert from "@/shared/components/Alert/Alert";
import Badge from "@/shared/components/Badge/Badge";
import { getSaleTransactionDetailAction } from "@/features/sales-transactions/actions/sale-transaction-detail.action";
import type { SaleTransactionDetail } from "@/features/sales-transactions/types/sale-transaction-detail.types";
import {
  SALES_PAYMENT_METHOD_LABEL,
  SALES_PAYMENT_STATUS_LABEL,
  type SalesPaymentMethod,
  type SalesPaymentStatus,
} from "@/features/sales-payments/types/sales-payment.types";
import { TRANSACTION_TYPE_OPTIONS } from "@/features/transactions/types/transaction-types";

type Props = {
  transactionId: string | null;
  open: boolean;
  onClose: () => void;
};

function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeLabel(type: string): string {
  const opt = TRANSACTION_TYPE_OPTIONS.find((o) => o.id === type);
  return opt?.label ?? type;
}

export default function SaleTransactionDetailDialog({
  transactionId,
  open,
  onClose,
}: Props) {
  const [detail, setDetail] = useState<SaleTransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !transactionId?.trim()) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    void getSaleTransactionDetailAction(transactionId.trim()).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setDetail(res.data);
      } else {
        setError(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, transactionId]);

  const status = (detail?.status ?? "") as SalesPaymentStatus;
  const paymentMethod = (detail?.paymentMethod ?? "") as SalesPaymentMethod;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        detail
          ? `${typeLabel(detail.transactionType)} ${detail.documentNumber || ""}`.trim()
          : "Detalle de transacción"
      }
      size="xl"
      scroll="paper"
      maxHeight="min(85vh, 720px)"
      showCloseButton
      hideActions
      data-test-id="sale-transaction-detail-dialog"
    >
      <div className="flex flex-col gap-4 p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground" data-test-id="sale-detail-loading">
            Cargando…
          </p>
        ) : null}

        {error ? (
          <Alert variant="error" data-test-id="sale-detail-error">
            {error}
          </Alert>
        ) : null}

        {detail && !loading ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary-outlined">{typeLabel(detail.transactionType)}</Badge>
              <Badge variant="info-outlined">
                {SALES_PAYMENT_STATUS_LABEL[status] ?? detail.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDateTime(detail.createdAt)}
              </span>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Cliente</dt>
                <dd className="font-medium">{detail.customerLabel ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Usuario</dt>
                <dd className="font-medium">
                  {detail.userFullName ?? detail.userUserName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sucursal</dt>
                <dd className="font-medium">{detail.branchName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Punto de venta</dt>
                <dd className="font-medium">{detail.pointOfSaleName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Medio de pago</dt>
                <dd className="font-medium">
                  {SALES_PAYMENT_METHOD_LABEL[paymentMethod] ?? detail.paymentMethod}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Referencia externa</dt>
                <dd className="font-medium">{detail.externalReference ?? "—"}</dd>
              </div>
            </dl>

            {detail.notes ? (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <span className="font-medium text-muted-foreground">Notas: </span>
                {detail.notes}
              </div>
            ) : null}

            <div className="overflow-auto rounded-md border border-border">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">SKU</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Cant.</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-medium">
                      P. unit.
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Dto.</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-medium">IVA</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                        Sin líneas de detalle
                      </td>
                    </tr>
                  ) : (
                    detail.lines.map((line) => (
                      <tr key={line.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          <div className="font-medium">{line.productName}</div>
                          {line.variantName ? (
                            <div className="text-xs text-muted-foreground">{line.variantName}</div>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                          {line.productSku ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {line.quantity}
                          {line.unitOfMeasure ? (
                            <span className="text-muted-foreground"> {line.unitOfMeasure}</span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {formatMoney(line.unitPrice)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {formatMoney(line.discountAmount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {formatMoney(line.taxAmount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium">
                          {formatMoney(line.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <dl className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium tabular-nums">{formatMoney(detail.subtotal)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Descuentos</dt>
                <dd className="font-medium tabular-nums">{formatMoney(detail.discountAmount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Impuestos</dt>
                <dd className="font-medium tabular-nums">{formatMoney(detail.taxAmount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total</dt>
                <dd className="text-base font-semibold tabular-nums">{formatMoney(detail.total)}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                Pagado:{" "}
                <strong className="text-foreground tabular-nums">
                  {formatMoney(detail.amountPaid)}
                </strong>
              </span>
              {detail.changeAmount != null && detail.changeAmount > 0 ? (
                <span>
                  Vuelto:{" "}
                  <strong className="text-foreground tabular-nums">
                    {formatMoney(detail.changeAmount)}
                  </strong>
                </span>
              ) : null}
            </div>
          </>
        ) : null}

        <div className="flex justify-end border-t border-border pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
