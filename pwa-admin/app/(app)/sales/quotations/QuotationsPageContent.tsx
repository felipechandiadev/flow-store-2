"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/shared/components/Button";
import { Select } from "@/shared/components/Select";
import { TextField } from "@/shared/components/TextField/TextField";
import Badge from "@/shared/components/Badge/Badge";
import IconButton from "@/shared/components/IconButton/IconButton";
import {
  QUOTATION_EFFECTIVE_STATUS_LABEL,
  type QuotationEffectiveStatus,
  type QuotationRow,
} from "@/features/quotations/types/quotation.types";
import { QuotationDetailDialog } from "./QuotationDetailDialog";

type Props = {
  initialItems: QuotationRow[];
  initialTotal: number;
  loadError: string | null;
  initialFilters: {
    effectiveStatus?: QuotationEffectiveStatus;
    search?: string;
    customerId?: string;
    branchId?: string;
    pointOfSaleId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
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

export function QuotationsPageContent({
  initialItems,
  initialTotal,
  loadError,
  initialFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<
    QuotationEffectiveStatus | ""
  >(initialFilters.effectiveStatus ?? "");
  const [search, setSearch] = useState(initialFilters.search ?? "");

  const [selected, setSelected] = useState<QuotationRow | null>(null);

  const items = initialItems;
  const total = initialTotal;

  const statusOptions = useMemo(
    () => [
      { id: "", label: "Todos" },
      { id: "ACTIVE", label: "Vigentes" },
      { id: "EXPIRED", label: "Vencidas" },
      { id: "CONVERTED", label: "Convertidas" },
      { id: "CANCELLED", label: "Anuladas" },
    ],
    [],
  );

  function applyFilters() {
    const params = new URLSearchParams(sp.toString());
    if (statusFilter) {
      params.set("effectiveStatus", statusFilter);
    } else {
      params.delete("effectiveStatus");
    }
    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    setStatusFilter("");
    setSearch("");
    router.replace(pathname);
  }

  return (
    <div
      className="flex w-full flex-col gap-4 p-4 md:p-6"
      data-test-id="quotations-page-root"
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Cotizaciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Cotizaciones emitidas a clientes. Una cotización no afecta inventario
          ni contabilidad hasta que se convierte en venta o pedido.
        </p>
      </header>

      <section
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
        data-test-id="quotations-page-filters"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Estado"
            options={statusOptions}
            value={statusFilter}
            onChange={(v) =>
              setStatusFilter((v as QuotationEffectiveStatus) ?? "")
            }
            data-test-id="quotations-page-filter-status"
          />
          <TextField
            label="Buscar"
            placeholder="Folio o nota"
            value={search}
            onChange={(e) =>
              setSearch(
                (e as React.ChangeEvent<HTMLInputElement>).target.value,
              )
            }
            data-test-id="quotations-page-filter-search"
          />
          <div className="flex items-end gap-2 lg:col-span-2">
            <Button
              variant="primary"
              onClick={applyFilters}
              data-test-id="quotations-page-filter-apply"
            >
              Aplicar
            </Button>
            <Button
              variant="outlinedSecondary"
              onClick={clearFilters}
              data-test-id="quotations-page-filter-clear"
            >
              Limpiar
            </Button>
          </div>
        </div>
      </section>

      {loadError ? (
        <p className="text-sm text-error">{loadError}</p>
      ) : items.length === 0 ? (
        <div
          className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"
          data-test-id="quotations-page-empty"
        >
          No hay cotizaciones con los filtros actuales.
        </div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground">
            {total} cotización{total === 1 ? "" : "es"}
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table
              className="w-full border-collapse text-sm"
              data-test-id="quotations-page-table"
            >
              <thead className="bg-muted/10 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Folio</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-left">Emitida</th>
                  <th className="px-3 py-2 text-left">Vence</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Convertida a</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((q) => (
                  <tr
                    key={q.id}
                    className="border-t border-border hover:bg-muted/10"
                    data-test-id={`quotations-row-${q.id}`}
                  >
                    <td className="px-3 py-2 font-mono">{q.documentNumber}</td>
                    <td className="px-3 py-2">
                      {q.customerName ?? "—"}
                      {q.customerDocument ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({q.customerDocument})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(Number(q.total), q.currency || "CLP")}
                    </td>
                    <td className="px-3 py-2">{formatDateTime(q.issuedAt)}</td>
                    <td className="px-3 py-2">
                      {formatDateTime(q.validUntil)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={q.effectiveStatus} />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {q.convertedToDocumentNumber ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <IconButton
                        icon="Eye"
                        variant="basicSecondary"
                        size="sm"
                        ariaLabel="Ver detalle"
                        onClick={() => setSelected(q)}
                        data-test-id={`quotations-row-detail-${q.id}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <QuotationDetailDialog
        quotation={selected}
        onClose={() => setSelected(null)}
        onChanged={() => {
          setSelected(null);
          router.refresh();
        }}
      />
    </div>
  );
}
