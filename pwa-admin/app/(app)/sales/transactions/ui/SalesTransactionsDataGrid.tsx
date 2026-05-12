"use client";

import { useMemo } from "react";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import Badge, { type BadgeVariant } from "@/shared/components/Badge/Badge";
import {
  SALES_PAYMENT_METHOD_LABEL,
  SALES_PAYMENT_STATUS_LABEL,
  type SalesPaymentMethod,
  type SalesPaymentStatus,
} from "@/features/sales-payments/types/sales-payment.types";
import { TRANSACTION_TYPE_OPTIONS } from "@/features/transactions/types/transaction-types";
import type { SalesTransactionListRow } from "@/features/sales-transactions/types/sales-transaction-list.types";

type SalesTransactionsDataGridProps = {
  rows: SalesTransactionListRow[];
  total: number;
  /** Título del listado (p. ej. «Ventas» vs «Devoluciones cliente»). */
  title?: string;
  /** Sufijo opcional para `data-test-id` cuando hay varias grillas. */
  testIdSuffix?: string;
};

function transactionTypeLabel(type: string): string {
  if (!type) return "—";
  const opt = TRANSACTION_TYPE_OPTIONS.find((o) => o.id === type);
  return opt?.label ?? type;
}

function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
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

export default function SalesTransactionsDataGrid({
  rows,
  total,
  title = "Ventas",
  testIdSuffix = "",
}: SalesTransactionsDataGridProps) {
  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "documentNumber",
        headerName: "Folio",
        sortable: false,
        minWidth: 140,
        flex: 0.6,
        valueGetter: ({ row }) =>
          (row as SalesTransactionListRow).documentNumber || "—",
      },
      {
        field: "createdAt",
        headerName: "Fecha",
        sortable: false,
        width: 160,
        valueGetter: ({ row }) =>
          formatDateTimeSlash((row as SalesTransactionListRow).createdAt),
      },
      {
        field: "transactionType",
        headerName: "Tipo",
        sortable: false,
        minWidth: 160,
        flex: 0.7,
        valueGetter: ({ row }) =>
          transactionTypeLabel((row as SalesTransactionListRow).transactionType),
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 130,
        valueGetter: ({ row }) => (row as SalesTransactionListRow).status,
        renderCell: ({ value }) => {
          const status = value as SalesPaymentStatus;
          return (
            <Badge variant={statusBadgeVariant(status)}>
              {SALES_PAYMENT_STATUS_LABEL[status] ?? status}
            </Badge>
          );
        },
      },
      {
        field: "counterpartyLabel",
        headerName: "Cliente / Proveedor",
        sortable: false,
        minWidth: 220,
        flex: 1,
        valueGetter: ({ row }) =>
          (row as SalesTransactionListRow).counterpartyLabel ?? "—",
      },
      {
        field: "userFullName",
        headerName: "Usuario",
        sortable: false,
        minWidth: 160,
        valueGetter: ({ row }) =>
          (row as SalesTransactionListRow).userFullName ?? "—",
      },
      {
        field: "paymentMethod",
        headerName: "Método",
        sortable: false,
        width: 140,
        valueGetter: ({ row }) => {
          const m = (row as SalesTransactionListRow)
            .paymentMethod as SalesPaymentMethod;
          return SALES_PAYMENT_METHOD_LABEL[m] ?? m;
        },
      },
      {
        field: "branchName",
        headerName: "Sucursal",
        sortable: false,
        minWidth: 140,
        valueGetter: ({ row }) =>
          (row as SalesTransactionListRow).branchName ?? "—",
      },
      {
        field: "pointOfSaleName",
        headerName: "Punto de venta",
        sortable: false,
        minWidth: 140,
        valueGetter: ({ row }) =>
          (row as SalesTransactionListRow).pointOfSaleName ?? "—",
      },
      {
        field: "total",
        headerName: "Total",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) =>
          formatMoney(Number((row as SalesTransactionListRow).total ?? 0)),
      },
    ],
    [],
  );

  const gridTestId =
    testIdSuffix.trim().length > 0
      ? `sales-transactions-data-grid-${testIdSuffix.trim()}`
      : "sales-transactions-data-grid";

  return (
    <DataGrid
      title={title}
      columns={columns}
      rows={rows}
      totalRows={total}
      totalGeneral={total}
      height="85vh"
      showExportButton={false}
      showSortButton={false}
      showFilterButton={false}
      data-test-id={gridTestId}
    />
  );
}
