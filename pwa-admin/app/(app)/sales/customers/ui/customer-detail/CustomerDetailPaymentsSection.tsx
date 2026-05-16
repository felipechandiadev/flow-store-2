"use client";

import { useEffect, useState } from "react";
import { getCustomerPaymentsListAction } from "@/features/sales-customers/actions/customer.action";

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function CustomerDetailPaymentsSection({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getCustomerPaymentsListAction(customerId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setRows(res.rows);
      } else {
        setError(res.error);
        setRows([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando pagos…</p>;
  }
  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay pagos listados para este cliente.</p>;
  }

  return (
    <div className="overflow-auto rounded-lg border border-border" data-test-id="customer-detail-payments">
      <table className="w-full min-w-[520px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
            <th className="px-3 py-2">Folio</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Método</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const id = String(r.id ?? i);
            const doc = r.documentNumber != null ? String(r.documentNumber) : "—";
            const type = r.type != null ? String(r.type) : "—";
            const status = r.status != null ? String(r.status) : "—";
            const method = r.paymentMethod != null ? String(r.paymentMethod) : "—";
            const total = Number(r.total) || 0;
            const created = r.createdAt != null ? String(r.createdAt) : "—";
            return (
              <tr key={`pay-${id}`} className="border-b border-border/80">
                <td className="px-3 py-2 font-mono text-[11px]">{doc}</td>
                <td className="px-3 py-2">{type}</td>
                <td className="px-3 py-2">{status}</td>
                <td className="px-3 py-2">{method}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtClp(total)}</td>
                <td className="px-3 py-2 text-muted-foreground">{created}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
