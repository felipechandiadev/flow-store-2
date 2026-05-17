"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/shared/admin-shared";
import { Badge } from "@/shared/components/Badge";
import { getCustomerPosDetailBundleAction } from "@/features/customers/actions/customers-pos.action";
import type {
  PosCustomerDetail,
  PosCustomerDetailBundle,
  PosCustomerCreditNoteRow,
  PosCustomerPaymentRow,
  PosCustomerPurchaseRow,
  PosCustomerQuotaRow,
  PosCustomerReturnRow,
} from "@/features/customers/types/pos-customer-detail.types";
import {
  CREDIT_NOTE_USAGE_LABEL,
  TX_TYPE_LABEL,
  creditNoteUsageVariant,
  documentTypeLabel,
  fmtClp,
  formatCustomerDateTime,
} from "@/features/customers/lib/pos-customer-detail-format";

export type PosCustomerDetailSectionId =
  | "summary"
  | "credit"
  | "purchases"
  | "payments"
  | "returns"
  | "creditNotes"
  | "quotas";

const NAV_ITEMS: { id: PosCustomerDetailSectionId; label: string }[] = [
  { id: "summary", label: "Resumen" },
  { id: "credit", label: "Crédito" },
  { id: "purchases", label: "Compras" },
  { id: "payments", label: "Pagos" },
  { id: "returns", label: "Devoluciones" },
  { id: "creditNotes", label: "Notas de crédito" },
  { id: "quotas", label: "Cuotas pendientes" },
];

const NAV_BTN =
  "w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm font-medium transition-colors";

type Props = {
  customerId: string | null;
  initialBundle: PosCustomerDetailBundle | null;
  invalidId: boolean;
  internalCreditEnabled?: boolean;
};

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="wrap-break-word text-sm text-foreground">{value || "—"}</dd>
    </div>
  );
}

function EmptyTableMsg({ children }: { children: string }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function refundModeLabel(mode: string | null): string {
  if (mode === "immediate") return "Reembolso inmediato";
  if (mode === "document") return "Solo documento";
  return "—";
}

export default function PosCustomerDetailPanel({
  customerId,
  initialBundle,
  invalidId,
  internalCreditEnabled = false,
}: Props) {
  const [section, setSection] = useState<PosCustomerDetailSectionId>("summary");
  const [bundle, setBundle] = useState<PosCustomerDetailBundle | null>(initialBundle);
  const [loading, setLoading] = useState(false);

  const navItems = useMemo(() => {
    if (internalCreditEnabled) return NAV_ITEMS;
    return NAV_ITEMS.filter((i) => i.id !== "credit" && i.id !== "quotas");
  }, [internalCreditEnabled]);

  useEffect(() => {
    if (!internalCreditEnabled && (section === "credit" || section === "quotas")) {
      setSection("summary");
    }
  }, [internalCreditEnabled, section]);

  useEffect(() => {
    const id = customerId?.trim();
    if (!id || invalidId) {
      setBundle(null);
      setLoading(false);
      return;
    }

    const initialMatches =
      initialBundle?.success === true && initialBundle.customer.customerId === id;
    if (initialMatches) {
      setBundle(initialBundle);
    } else {
      setBundle(null);
    }

    let cancelled = false;
    if (!initialMatches) setLoading(true);

    void getCustomerPosDetailBundleAction(id).then((res) => {
      if (cancelled) return;
      setBundle(res);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [customerId, invalidId, initialBundle]);

  if (invalidId) {
    return (
      <aside
        className="flex min-h-[min(48vh,520px)] w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm md:min-h-[76vh]"
        data-test-id="pos-customer-detail-panel"
      >
        <h2 className="text-sm font-semibold text-foreground">Ficha del cliente</h2>
        <Alert variant="error" className="text-sm">
          El identificador en la URL no es válido.
        </Alert>
      </aside>
    );
  }

  if (!customerId?.trim()) {
    return (
      <aside
        className="flex min-h-[min(48vh,520px)] md:min-h-[76vh] w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm"
        data-test-id="pos-customer-detail-panel-empty"
      >
        <h2 className="text-sm font-semibold text-foreground">Ficha del cliente</h2>
        <p className="text-sm text-muted-foreground">
          Busca y elige un cliente en el panel izquierdo para ver su ficha completa.
        </p>
      </aside>
    );
  }

  if (loading && (!bundle || !bundle.success)) {
    return (
      <aside
        className="flex min-h-[min(48vh,520px)] md:min-h-[76vh] w-full min-w-0 items-center justify-center rounded-xl border border-border bg-background p-4 shadow-sm"
        data-test-id="pos-customer-detail-panel-loading"
      >
        <p className="text-sm text-muted-foreground">Cargando ficha del cliente…</p>
      </aside>
    );
  }

  if (!bundle || !bundle.success) {
    return (
      <aside
        className="flex min-h-[min(48vh,520px)] md:min-h-[76vh] w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm"
        data-test-id="pos-customer-detail-panel-error"
      >
        <h2 className="text-sm font-semibold text-foreground">Ficha del cliente</h2>
        <Alert variant="error" className="text-sm">
          {bundle && !bundle.success ? bundle.message : "No se pudo cargar el cliente."}
        </Alert>
      </aside>
    );
  }

  const customer = bundle.customer;
  const { payments, quotas, purchases, returns, creditNotes } = bundle;

  return (
    <aside
      className="flex min-h-[min(48vh,520px)] md:min-h-[76vh] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm"
      data-test-id="pos-customer-detail-panel"
    >
      <header className="shrink-0 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Ficha del cliente</h2>
        <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
          {customer.displayName}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant={customer.isActive ? "success-outlined" : "secondary-outlined"}>
            {customer.isActive ? "Activo" : "Inactivo"}
          </Badge>
          {loading ? (
            <span className="text-xs text-muted-foreground">Actualizando…</span>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <nav
          className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-border bg-muted/20 p-2 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r sm:p-3"
          aria-label="Secciones de la ficha"
        >
          {navItems.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={[
                  NAV_BTN,
                  active
                    ? "border-l-2 border-secondary bg-background text-foreground shadow-sm"
                    : "border-l-2 border-transparent text-muted-foreground hover:bg-background/80",
                ].join(" ")}
                aria-current={active ? "true" : undefined}
                onClick={() => setSection(item.id)}
                data-test-id={`pos-customer-detail-nav-${item.id}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
          {section === "summary" ? (
            <SummarySection customer={customer} />
          ) : null}
          {section === "credit" && internalCreditEnabled ? (
            <CreditSection customer={customer} />
          ) : null}
          {section === "purchases" ? <PurchasesSection rows={purchases} /> : null}
          {section === "payments" ? <PaymentsSection rows={payments} /> : null}
          {section === "returns" ? <ReturnsSection rows={returns} /> : null}
          {section === "creditNotes" ? <CreditNotesSection rows={creditNotes} /> : null}
          {section === "quotas" && internalCreditEnabled ? (
            <QuotasSection rows={quotas} />
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function SummarySection({ customer }: { customer: PosCustomerDetail }) {
  const docLine = [
    documentTypeLabel(customer.documentType),
    customer.documentNumber?.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="space-y-4" data-test-id="pos-customer-detail-summary">
      <dl className="grid gap-3 sm:grid-cols-2">
        <DetailField label="Documento" value={docLine} />
        <DetailField label="Teléfono" value={customer.phone ?? ""} />
        <DetailField label="Email" value={customer.email ?? ""} />
        <DetailField label="Dirección" value={customer.address ?? ""} />
        <DetailField label="Alta" value={formatCustomerDateTime(customer.createdAt)} />
        <DetailField label="Última actualización" value={formatCustomerDateTime(customer.updatedAt)} />
      </dl>
      {customer.notes?.trim() ? (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Notas</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{customer.notes.trim()}</p>
        </div>
      ) : null}
    </section>
  );
}

function CreditSection({ customer }: { customer: PosCustomerDetail }) {
  return (
    <section data-test-id="pos-customer-detail-credit">
      <dl className="grid gap-3 sm:grid-cols-2">
        <DetailField label="Límite de crédito" value={fmtClp(customer.creditLimit)} />
        <DetailField label="Utilizado" value={fmtClp(customer.usedCredit)} />
        <DetailField label="Disponible" value={fmtClp(customer.availableCredit)} />
        <DetailField
          label="Día de pago"
          value={
            customer.paymentDayOfMonth != null && Number.isFinite(customer.paymentDayOfMonth)
              ? String(customer.paymentDayOfMonth)
              : ""
          }
        />
      </dl>
    </section>
  );
}

function PurchasesSection({ rows }: { rows: PosCustomerPurchaseRow[] }) {
  if (rows.length === 0) {
    return <EmptyTableMsg>No hay ventas ni encargos registrados.</EmptyTableMsg>;
  }
  return (
    <DataTable
      testId="pos-customer-detail-purchases"
      headers={["Folio", "Tipo", "Estado", "Total", "Fecha"]}
      rows={rows.map((r) => {
        const typeKey = r.transactionType ?? "";
        return [
          r.documentNumber ?? "—",
          TX_TYPE_LABEL[typeKey] ?? (typeKey || "—"),
          r.status ?? "—",
          fmtClp(r.total),
          formatCustomerDateTime(r.createdAt),
        ];
      })}
    />
  );
}

function PaymentsSection({ rows }: { rows: PosCustomerPaymentRow[] }) {
  if (rows.length === 0) {
    return <EmptyTableMsg>No hay cobros (pagos a cuenta) registrados.</EmptyTableMsg>;
  }
  return (
    <DataTable
      testId="pos-customer-detail-payments"
      headers={["Folio", "Tipo", "Estado", "Medio", "Monto", "Fecha"]}
      rows={rows.map((r) => {
        const typeKey = r.type ?? "";
        return [
          r.documentNumber ?? "—",
          TX_TYPE_LABEL[typeKey] ?? (typeKey || "—"),
          r.status ?? "—",
          r.paymentMethod ?? "—",
          fmtClp(r.total),
          formatCustomerDateTime(r.createdAt),
        ];
      })}
    />
  );
}

function ReturnsSection({ rows }: { rows: PosCustomerReturnRow[] }) {
  if (rows.length === 0) {
    return <EmptyTableMsg>No hay devoluciones registradas.</EmptyTableMsg>;
  }
  return (
    <div className="overflow-auto rounded-lg border border-border" data-test-id="pos-customer-detail-returns">
      <table className="w-full min-w-[640px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
            <th className="px-3 py-2">Folio</th>
            <th className="px-3 py-2">Modo</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2">NC asociada</th>
            <th className="px-3 py-2">Estado NC</th>
            <th className="px-3 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/80">
              <td className="px-3 py-2 font-mono">{r.documentNumber}</td>
              <td className="px-3 py-2">{refundModeLabel(r.refundMode)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtClp(r.total)}</td>
              <td className="px-3 py-2 font-mono">{r.linkedCreditNote?.documentNumber ?? "—"}</td>
              <td className="px-3 py-2">
                {r.linkedCreditNote ? (
                  <Badge variant={creditNoteUsageVariant(r.linkedCreditNote.usageStatus)}>
                    {CREDIT_NOTE_USAGE_LABEL[r.linkedCreditNote.usageStatus]}
                  </Badge>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {formatCustomerDateTime(r.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreditNotesSection({ rows }: { rows: PosCustomerCreditNoteRow[] }) {
  if (rows.length === 0) {
    return <EmptyTableMsg>No hay notas de crédito registradas.</EmptyTableMsg>;
  }
  return (
    <div
      className="overflow-auto rounded-lg border border-border"
      data-test-id="pos-customer-detail-credit-notes"
    >
      <table className="w-full min-w-[560px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
            <th className="px-3 py-2">Folio NC</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2 text-right">Utilizado</th>
            <th className="px-3 py-2 text-right">Disponible</th>
            <th className="px-3 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/80">
              <td className="px-3 py-2 font-mono">{r.documentNumber}</td>
              <td className="px-3 py-2">
                <Badge variant={creditNoteUsageVariant(r.usageStatus)}>
                  {CREDIT_NOTE_USAGE_LABEL[r.usageStatus]}
                </Badge>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtClp(r.total)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtClp(r.consumedAmount)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">
                {fmtClp(r.availableAmount)}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {formatCustomerDateTime(r.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuotasSection({ rows }: { rows: PosCustomerQuotaRow[] }) {
  if (rows.length === 0) {
    return <EmptyTableMsg>Sin cuotas pendientes registradas.</EmptyTableMsg>;
  }
  return (
    <DataTable
      testId="pos-customer-detail-quotas"
      headers={["Documento", "Vencimiento", "Monto"]}
      rows={rows.map((q) => [
        q.documentNumber ?? q.transactionId ?? "—",
        formatCustomerDateTime(q.dueDate),
        fmtClp(q.amount),
      ])}
    />
  );
}

function DataTable({
  testId,
  headers,
  rows,
}: {
  testId: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-auto rounded-lg border border-border" data-test-id={testId}>
      <table className="w-full min-w-[480px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
            {headers.map((h) => (
              <th
                key={h}
                className={`px-3 py-2 ${h === "Total" || h === "Monto" ? "text-right" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={`row-${i}`} className="border-b border-border/80">
              {cells.map((cell, j) => (
                <td
                  key={`cell-${i}-${j}`}
                  className={`px-3 py-2 ${j >= cells.length - 2 && (headers[j] === "Total" || headers[j] === "Monto") ? "text-right tabular-nums font-medium" : ""} ${j === 0 ? "font-mono" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
