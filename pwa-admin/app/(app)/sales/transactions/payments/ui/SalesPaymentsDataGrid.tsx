"use client";

import { useMemo } from "react";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import Badge, { type BadgeVariant } from "@/shared/components/Badge/Badge";
import {
  SALES_PAYMENT_METHOD_LABEL,
  SALES_PAYMENT_STATUS_LABEL,
  type SalesPaymentMethod,
  type SalesPaymentRow,
  type SalesPaymentStatus,
} from "@/features/sales-payments/types/sales-payment.types";

type SalesPaymentsDataGridProps = {
  rows: SalesPaymentRow[];
  total: number;
};

function formatMoney(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currency || "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTimeSlash(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const dt = new Date(value.trim());
  if (Number.isNaN(dt.getTime())) return "—";
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

function statusBadgeVariant(status: SalesPaymentStatus): BadgeVariant {
  if (status === "COMPLETED" || status === "RECEIVED") return "success-outlined";
  if (status === "VOIDED" || status === "CANCELLED") return "error-outlined";
  if (status === "PENDING" || status === "PARTIALLY_RECEIVED")
    return "warning-outlined";
  if (status === "EXPIRED") return "warning-outlined";
  return "secondary-outlined";
}

export default function SalesPaymentsDataGrid({
  rows,
  total,
}: SalesPaymentsDataGridProps) {
  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "documentNumber",
        headerName: "Folio",
        sortable: false,
        minWidth: 140,
        flex: 0.7,
        valueGetter: ({ row }) =>
          (row as SalesPaymentRow).documentNumber || "—",
      },
      {
        field: "createdAt",
        headerName: "Fecha",
        sortable: false,
        width: 160,
        valueGetter: ({ row }) =>
          formatDateTimeSlash((row as SalesPaymentRow).createdAt),
      },
      {
        field: "customerName",
        headerName: "Cliente",
        sortable: false,
        minWidth: 220,
        flex: 1,
        valueGetter: ({ row }) => {
          const r = row as SalesPaymentRow;
          if (!r.customerName) return "—";
          return r.customerDocument
            ? `${r.customerName} (${r.customerDocument})`
            : r.customerName;
        },
      },
      {
        field: "paymentMethod",
        headerName: "Método",
        sortable: false,
        width: 140,
        valueGetter: ({ row }) => {
          const m = (row as SalesPaymentRow).paymentMethod as SalesPaymentMethod;
          return SALES_PAYMENT_METHOD_LABEL[m] ?? m;
        },
      },
      {
        field: "branchName",
        headerName: "Sucursal",
        sortable: false,
        minWidth: 140,
        valueGetter: ({ row }) => (row as SalesPaymentRow).branchName ?? "—",
      },
      {
        field: "pointOfSaleName",
        headerName: "Punto de venta",
        sortable: false,
        minWidth: 140,
        valueGetter: ({ row }) =>
          (row as SalesPaymentRow).pointOfSaleName ?? "—",
      },
      {
        field: "total",
        headerName: "Total",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) => {
          const r = row as SalesPaymentRow;
          return formatMoney(Number(r.total ?? 0), r.currency || "CLP");
        },
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 130,
        valueGetter: ({ row }) => (row as SalesPaymentRow).status,
        renderCell: ({ value }) => {
          const status = value as SalesPaymentStatus;
          return (
            <Badge variant={statusBadgeVariant(status)}>
              {SALES_PAYMENT_STATUS_LABEL[status] ?? status}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  return (
    <DataGrid
      title="Pagos recibidos"
      columns={columns}
      rows={rows}
      totalRows={total}
      totalGeneral={total}
      height="85vh"
      showExportButton={false}
      showSortButton={false}
      showFilterButton={false}
      data-test-id="sales-payments-data-grid"
    />
  );
}
