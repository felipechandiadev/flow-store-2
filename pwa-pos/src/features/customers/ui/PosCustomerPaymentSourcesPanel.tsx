"use client";

import { DotProgress } from "@/shared/admin-shared";
import type { CustomerPaymentSources } from "@/features/customers/types/customer-payment-sources.types";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

type Props = {
  sources: CustomerPaymentSources;
  loading?: boolean;
  error?: string | null;
};

export default function PosCustomerPaymentSourcesPanel({ sources, loading, error }: Props) {
  const hasNc = sources.creditNotes.length > 0;
  const hasAdv = sources.orderAdvances.length > 0;

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground"
        data-test-id="pos-customer-payment-sources-loading"
      >
        <DotProgress />
        <span>Cargando notas de crédito y abonos…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-destructive" data-test-id="pos-customer-payment-sources-error">
        {error}
      </p>
    );
  }

  if (!hasNc && !hasAdv) {
    return (
      <p
        className="text-xs text-muted-foreground"
        data-test-id="pos-customer-payment-sources-empty"
      >
        Sin notas de crédito ni abonos de encargo disponibles para aplicar como pago.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-test-id="pos-customer-payment-sources">
      {hasNc ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notas de crédito disponibles
          </h3>
          <ul className="mt-2 space-y-2">
            {sources.creditNotes.map((nc) => (
              <li
                key={nc.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                data-test-id={`pos-customer-nc-${nc.id}`}
              >
                <span className="font-mono font-medium text-foreground">{nc.documentNumber}</span>
                <span className="shrink-0 tabular-nums font-semibold text-foreground">
                  {formatMoney(nc.availableAmount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasAdv ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Abonos por encargo disponibles
          </h3>
          <ul className="mt-2 space-y-2">
            {sources.orderAdvances.map((bo) => (
              <li
                key={bo.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                data-test-id={`pos-customer-advance-${bo.id}`}
              >
                <span className="font-mono font-medium text-foreground">{bo.documentNumber}</span>
                <span className="shrink-0 tabular-nums font-semibold text-foreground">
                  {formatMoney(bo.availableAmount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
