"use client";

import { useCallback, useMemo, useState } from "react";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import { dataGridFillViewportTabPageProps } from "@/shared/components/layouts/layoutPageTokens";
import Badge, { type BadgeVariant } from "@/shared/components/Badge/Badge";
import IconButton from "@/shared/components/IconButton/IconButton";
import {
  SALES_PAYMENT_METHOD_LABEL,
  SALES_PAYMENT_STATUS_LABEL,
  type SalesPaymentMethod,
  type SalesPaymentStatus,
} from "@/features/sales-payments/types/sales-payment.types";
import type { SalesTransactionListRow } from "@/features/sales-transactions/types/sales-transaction-list.types";
import { formatSalePaymentMethodDisplay } from "@/features/sales-transactions/lib/format-sale-payment-method";
import SaleTransactionDetailDialog from "./SaleTransactionDetailDialog";

type SalesTransactionsDataGridProps = {
  rows: SalesTransactionListRow[];
  total: number;
  /** Sufijo opcional para `data-test-id` cuando hay varias grillas. */
  testIdSuffix?: string;
  /** Columnas extra para encargos (abono / total pedido). */
  variant?: "default" | "backorder";
};

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
  testIdSuffix = "",
  variant = "default",
}: SalesTransactionsDataGridProps) {
  const [detailTxId, setDetailTxId] = useState<string | null>(null);

  const openDetail = useCallback((r: SalesTransactionListRow) => {
    setDetailTxId(r.id);
  }, []);

  const columns: DataGridColumn[] = useMemo(() => {
    function SalesTransactionActionsCell({ row }: { row: any; column: DataGridColumn }) {
      const r = row as SalesTransactionListRow;
      return (
        <div
          className="flex items-center justify-center"
          data-test-id={`sales-transactions-row-actions-${r.id}`}
        >
          <IconButton
            icon="MoreHorizontal"
            variant="basicSecondary"
            size="sm"
            ariaLabel="Ver detalle de la transacción"
            onClick={() => openDetail(r)}
            data-test-id={`sales-transactions-row-detail-${r.id}`}
          />
        </div>
      );
    }

    return [
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
          const r = row as SalesTransactionListRow;
          return formatSalePaymentMethodDisplay(
            r.paymentMethod as SalesPaymentMethod,
            r.paymentLinesCount,
          );
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
      ...(variant === "backorder"
        ? [
            {
              field: "backorderDepositAmount",
              headerName: "Abono",
              sortable: false,
              width: 120,
              align: "right" as const,
              valueGetter: ({ row }: { row: unknown }) => {
                const r = row as SalesTransactionListRow;
                const deposit =
                  r.backorderDepositAmount != null && r.backorderDepositAmount > 0
                    ? r.backorderDepositAmount
                    : r.amountPaid;
                const pct =
                  r.backorderPercent != null && r.backorderPercent > 0
                    ? ` (${r.backorderPercent}%)`
                    : "";
                return `${formatMoney(deposit)}${pct}`;
              },
            },
          ]
        : []),
      {
        field: "total",
        headerName: variant === "backorder" ? "Total pedido" : "Total",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) =>
          formatMoney(Number((row as SalesTransactionListRow).total ?? 0)),
      },
      {
        field: "actions",
        headerName: "",
        width: 72,
        minWidth: 72,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: SalesTransactionActionsCell,
      },
    ];
  }, [openDetail, variant]);

  const gridTestId =
    testIdSuffix.trim().length > 0
      ? `sales-transactions-data-grid-${testIdSuffix.trim()}`
      : "sales-transactions-data-grid";

  return (
    <>
      <DataGrid
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        {...dataGridFillViewportTabPageProps}
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        pinActionsColumn
        data-test-id={gridTestId}
      />
      <SaleTransactionDetailDialog
        transactionId={detailTxId}
        open={detailTxId != null}
        onClose={() => setDetailTxId(null)}
      />
    </>
  );
}
