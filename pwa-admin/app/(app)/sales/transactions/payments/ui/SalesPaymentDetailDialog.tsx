"use client";

import { useEffect, useState } from "react";
import Dialog from "@/shared/components/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import Badge, { type BadgeVariant } from "@/shared/components/Badge/Badge";
import {
  SALES_PAYMENT_STATUS_LABEL,
  type SalesPaymentRow,
  type SalesPaymentStatus,
} from "@/features/sales-payments/types/sales-payment.types";
import { getSaleTransactionDetailAction } from "@/features/sales-transactions/actions/sale-transaction-detail.action";
import { formatSalePaymentMethodDisplay } from "@/features/sales-transactions/lib/format-sale-payment-method";
import type { SaleTransactionDetail } from "@/features/sales-transactions/types/sale-transaction-detail.types";
import SalePaymentsBreakdownTable from "@/features/sales-transactions/ui/SalePaymentsBreakdownTable";
import { getTransactionStatusLabel } from "@/features/transactions/types/transaction-types";

type Props = {
  payment: SalesPaymentRow | null;
  open: boolean;
  onClose: () => void;
  onOpenRelatedSale?: (saleId: string) => void;
};

function formatMoney(amount: number, currency = "CLP"): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
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

function statusBadgeVariant(status: SalesPaymentStatus): BadgeVariant {
  if (status === "COMPLETED" || status === "RECEIVED") return "success-outlined";
  if (status === "VOIDED" || status === "CANCELLED") return "error-outlined";
  if (status === "PENDING" || status === "PARTIALLY_RECEIVED")
    return "warning-outlined";
  if (status === "EXPIRED") return "warning-outlined";
  return "secondary-outlined";
}

export default function SalesPaymentDetailDialog({
  payment,
  open,
  onClose,
  onOpenRelatedSale,
}: Props) {
  const [detail, setDetail] = useState<SaleTransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !payment?.id?.trim()) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    void getSaleTransactionDetailAction(payment.id.trim()).then((res) => {
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
  }, [open, payment?.id]);

  if (!payment) return null;

  const currency = payment.currency || "CLP";
  const status = (detail?.status ?? payment.status) as SalesPaymentStatus;
  const customerName =
    detail?.customerLabel?.trim() || payment.customerName?.trim() || "—";
  const customerDocument =
    detail?.customerDocument?.trim() || payment.customerDocument?.trim() || null;
  const paymentMethodDisplay = formatSalePaymentMethodDisplay(
    (detail?.paymentMethod ?? payment.paymentMethod) as SalesPaymentRow["paymentMethod"],
    detail?.payments?.length ?? payment.paymentLinesCount,
  );
  const relatedSaleId = payment.relatedSaleId?.trim() || null;
  const relatedSaleFolio = payment.relatedSaleDocumentNumber?.trim() || null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Cobro ${payment.documentNumber || ""}`.trim()}
      size="lg"
      scroll="paper"
      maxHeight="min(85vh, 640px)"
      showCloseButton
      hideActions
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      data-test-id="sales-payment-detail-dialog"
    >
      <div className="flex flex-col gap-4 p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Estado</div>
                <Badge variant={statusBadgeVariant(status)} className="mt-1">
                  {SALES_PAYMENT_STATUS_LABEL[status] ??
                    getTransactionStatusLabel(status)}
                </Badge>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Fecha</div>
                <div className="text-sm font-medium">
                  {formatDateTime(detail?.createdAt ?? payment.createdAt)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Cliente</div>
                <div className="text-sm">{customerName}</div>
                {customerDocument ? (
                  <div className="text-xs text-muted-foreground">{customerDocument}</div>
                ) : null}
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Método</div>
                <div className="text-sm font-medium">{paymentMethodDisplay}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Sucursal</div>
                <div className="text-sm">
                  {detail?.branchName ?? payment.branchName ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Punto de venta
                </div>
                <div className="text-sm">
                  {detail?.pointOfSaleName ?? payment.pointOfSaleName ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Monto cobrado</div>
                <div className="text-lg font-semibold tabular-nums">
                  {formatMoney(
                    Number(detail?.total ?? payment.total),
                    currency,
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Registrado pagado</div>
                <div className="text-sm font-medium tabular-nums">
                  {formatMoney(
                    Number(detail?.amountPaid ?? payment.amountPaid),
                    currency,
                  )}
                </div>
              </div>
              {relatedSaleFolio && relatedSaleId ? (
                <div className="sm:col-span-2">
                  <div className="text-xs uppercase text-muted-foreground">
                    Venta relacionada
                  </div>
                  {onOpenRelatedSale ? (
                    <button
                      type="button"
                      className="font-mono text-sm text-primary underline-offset-2 hover:underline"
                      onClick={() => onOpenRelatedSale(relatedSaleId)}
                      data-test-id="sales-payment-detail-related-sale"
                    >
                      {relatedSaleFolio}
                    </button>
                  ) : (
                    <span className="font-mono text-sm">{relatedSaleFolio}</span>
                  )}
                </div>
              ) : null}
              {(detail?.externalReference ?? payment.externalReference) ? (
                <div className="sm:col-span-2">
                  <div className="text-xs uppercase text-muted-foreground">
                    Referencia externa
                  </div>
                  <div className="font-mono text-sm">
                    {detail?.externalReference ?? payment.externalReference}
                  </div>
                </div>
              ) : null}
              {(detail?.notes ?? payment.notes) ? (
                <div className="sm:col-span-2">
                  <div className="text-xs uppercase text-muted-foreground">Notas</div>
                  <p className="whitespace-pre-line text-sm">
                    {detail?.notes ?? payment.notes}
                  </p>
                </div>
              ) : null}
              {detail?.userFullName || detail?.userUserName ? (
                <div className="sm:col-span-2">
                  <div className="text-xs uppercase text-muted-foreground">Usuario</div>
                  <div className="text-sm">
                    {detail?.userFullName ?? detail?.userUserName}
                    {detail?.userFullName && detail?.userUserName
                      ? ` (${detail.userUserName})`
                      : null}
                  </div>
                </div>
              ) : null}
            </div>

            {detail && detail.payments.length > 0 ? (
              <SalePaymentsBreakdownTable payments={detail.payments} />
            ) : null}
          </>
        )}
      </div>
    </Dialog>
  );
}
