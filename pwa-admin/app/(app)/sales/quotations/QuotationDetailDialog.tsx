"use client";

import { useCallback, useEffect, useState } from "react";
import Dialog from "@/shared/components/Dialog";
import { Button } from "@/shared/components/Button";
import { Select } from "@/shared/components/Select";
import { TextField } from "@/shared/components/TextField/TextField";
import Badge from "@/shared/components/Badge/Badge";
import Alert from "@/shared/components/Alert/Alert";
import {
  QUOTATION_EFFECTIVE_STATUS_LABEL,
  type QuotationDetail,
  type QuotationEffectiveStatus,
  type QuotationRow,
} from "@/features/quotations/types/quotation.types";
import {
  cancelQuotationAction,
  convertQuotationAction,
  getQuotationByIdAction,
} from "@/features/quotations/actions/quotations.action";

type Props = {
  quotation: QuotationRow | null;
  onClose: () => void;
  onChanged: () => void;
};

function formatMoney(n: number, currency = "CLP"): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDateTime(iso: string | null | undefined): string {
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

function StatusBadge({ status }: { status: QuotationEffectiveStatus }) {
  const variant =
    status === "ACTIVE"
      ? "success-outlined"
      : status === "EXPIRED"
        ? "warning-outlined"
        : status === "CONVERTED"
          ? "primary-outlined"
          : "secondary-outlined";
  return (
    <Badge variant={variant as any}>
      {QUOTATION_EFFECTIVE_STATUS_LABEL[status]}
    </Badge>
  );
}

export function QuotationDetailDialog({
  quotation,
  onClose,
  onChanged,
}: Props) {
  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [cancelReason, setCancelReason] = useState("");
  const [convertTarget, setConvertTarget] = useState<"SALE" | "CUSTOMER_ORDER">(
    "SALE",
  );
  const [overrideExpired, setOverrideExpired] = useState(false);

  const open = !!quotation;

  const refetch = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    const res = await getQuotationByIdAction(id);
    if (res.success) {
      setDetail(res.quotation);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!quotation) {
      setDetail(null);
      setCancelReason("");
      setOverrideExpired(false);
      setConvertTarget("SALE");
      setError(null);
      return;
    }
    void refetch(quotation.id);
  }, [quotation, refetch]);

  if (!quotation) return null;

  const current = detail ?? quotation;
  const status = (detail?.effectiveStatus ??
    quotation.effectiveStatus) as QuotationEffectiveStatus;

  const canCancel = status === "ACTIVE" || status === "EXPIRED";
  const canConvert = status === "ACTIVE" || status === "EXPIRED";

  async function doCancel() {
    if (!quotation) return;
    setBusy(true);
    setError(null);
    const res = await cancelQuotationAction(
      quotation.id,
      cancelReason.trim() || undefined,
    );
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onChanged();
  }

  async function doConvert() {
    if (!quotation) return;
    setBusy(true);
    setError(null);
    const res = await convertQuotationAction(quotation.id, {
      targetType: convertTarget,
      overrideExpired: status === "EXPIRED" ? true : overrideExpired,
    });
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onChanged();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Cotización ${current.documentNumber}`}
      size="xl"
      scroll="paper"
      showCloseButton
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button variant="outlinedSecondary" onClick={onClose} disabled={busy}>
            Cerrar
          </Button>
          {canCancel ? (
            <Button
              variant="outlined"
              onClick={doCancel}
              disabled={busy}
              data-test-id="quotation-cancel-btn"
            >
              {busy ? "Anulando…" : "Anular"}
            </Button>
          ) : null}
          {canConvert ? (
            <Button
              variant="primary"
              onClick={doConvert}
              disabled={busy}
              data-test-id="quotation-convert-btn"
            >
              {busy ? "Convirtiendo…" : `Convertir a ${convertTarget}`}
            </Button>
          ) : null}
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Estado
              </div>
              <StatusBadge status={status} />
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Total
              </div>
              <div className="text-lg font-semibold">
                {formatMoney(Number(current.total), current.currency || "CLP")}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Cliente
              </div>
              <div>{current.customerName ?? "—"}</div>
              {current.customerDocument ? (
                <div className="text-xs text-muted-foreground">
                  {current.customerDocument}
                </div>
              ) : null}
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Vigencia
              </div>
              <div className="text-sm">
                Emitida: {formatDateTime(current.issuedAt)}
              </div>
              <div className="text-sm">
                Vence: {formatDateTime(current.validUntil)} ({current.validityDays} días)
              </div>
            </div>
            {current.convertedToDocumentNumber ? (
              <div className="sm:col-span-2">
                <div className="text-xs uppercase text-muted-foreground">
                  Convertida a
                </div>
                <div className="font-mono">
                  {current.convertedToDocumentNumber} ·{" "}
                  {formatDateTime(current.convertedAt)}
                </div>
              </div>
            ) : null}
            {current.terms ? (
              <div className="sm:col-span-2">
                <div className="text-xs uppercase text-muted-foreground">
                  Términos
                </div>
                <p className="whitespace-pre-line text-sm">{current.terms}</p>
              </div>
            ) : null}
          </div>

          {detail ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/10 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-right">Cant.</th>
                    <th className="px-3 py-2 text-right">P. unit.</th>
                    <th className="px-3 py-2 text-right">Desc.</th>
                    <th className="px-3 py-2 text-right">Imp.</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <div className="font-medium">{l.productName}</div>
                        {l.variantName ? (
                          <div className="text-xs text-muted-foreground">
                            {l.variantName}
                          </div>
                        ) : null}
                        {l.productSku ? (
                          <div className="text-xs text-muted-foreground">
                            SKU: {l.productSku}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {l.quantity}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(l.unitPrice, current.currency || "CLP")}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {l.discountAmount > 0
                          ? formatMoney(l.discountAmount, current.currency || "CLP")
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {l.taxAmount > 0
                          ? formatMoney(l.taxAmount, current.currency || "CLP")
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {formatMoney(l.total, current.currency || "CLP")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {canCancel || canConvert ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/5 p-3">
              {canConvert ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    label="Convertir a"
                    options={[
                      { id: "SALE", label: "Venta (SALE)" },
                      { id: "CUSTOMER_ORDER", label: "Pedido cliente" },
                    ]}
                    value={convertTarget}
                    onChange={(v) =>
                      setConvertTarget((v as "SALE" | "CUSTOMER_ORDER") ?? "SALE")
                    }
                    data-test-id="quotation-convert-target"
                  />
                  {status === "EXPIRED" ? (
                    <div className="flex items-center text-xs text-warning">
                      Cotización vencida: al convertir se respetan los precios
                      cotizados (a menos que la empresa lo haya configurado al
                      contrario).
                    </div>
                  ) : null}
                </div>
              ) : null}
              {canCancel ? (
                <TextField
                  label="Motivo de anulación (opcional)"
                  value={cancelReason}
                  onChange={(e) =>
                    setCancelReason(
                      (e as React.ChangeEvent<HTMLInputElement>).target.value,
                    )
                  }
                  data-test-id="quotation-cancel-reason"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
