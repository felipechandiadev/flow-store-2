"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import Badge from "@/shared/components/Badge/Badge";
import IconButton from "@/shared/components/IconButton/IconButton";
import { ButtonPill } from "@/shared/components/Button";
import type { AccountsPayableRow } from "@/features/accounting-accounts-payable/types/accounts-payable.types";
import {
  labelAccountsPayablePayeeType,
  labelAccountsPayablePaymentType,
  labelAccountsPayableStatus,
} from "@/features/accounting-accounts-payable/lib/accounts-payable-labels";
import CompleteAccountsPayablePaymentDialog from "./CompleteAccountsPayablePaymentDialog";
import AccountsPayablePaymentDetailsDialog from "./AccountsPayablePaymentDetailsDialog";
import AccountsPayableCalendar from "./AccountsPayableCalendar";

type AccountsPayableDataGridProps = {
  rows: AccountsPayableRow[];
};

function fmtClp(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function StatusBadge({ status, isOverdue }: { status: string; isOverdue: boolean }) {
  const variant =
    status === "PAID"
      ? "success-outlined"
      : status === "PARTIAL"
        ? "info-outlined"
        : status === "OVERDUE" || isOverdue
          ? "error-outlined"
          : "warning-outlined";
  return (
    <Badge variant={variant as "success-outlined"}>
      {labelAccountsPayableStatus(status)}
    </Badge>
  );
}

export default function AccountsPayableDataGrid({ rows }: AccountsPayableDataGridProps) {
  const router = useRouter();
  const [payRow, setPayRow] = useState<AccountsPayableRow | null>(null);
  const [detailsRow, setDetailsRow] = useState<AccountsPayableRow | null>(null);
  const [view, setView] = useState<"grid" | "calendar">("grid");

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "payeeName",
        headerName: "Beneficiario",
        sortable: true,
        minWidth: 180,
        flex: 1,
        valueGetter: ({ row }) => (row as AccountsPayableRow).payeeName?.trim() || "—",
      },
      {
        field: "parentDocumentNumber",
        headerName: "Documento",
        sortable: true,
        minWidth: 140,
        valueGetter: ({ row }) => {
          const r = row as AccountsPayableRow;
          return r.parentDocumentNumber || r.fromReceptionNumber || r.documentNumber || "—";
        },
      },
      {
        field: "paymentType",
        headerName: "Origen",
        sortable: true,
        width: 140,
        valueGetter: ({ row }) =>
          labelAccountsPayablePaymentType((row as AccountsPayableRow).paymentType),
      },
      {
        field: "payeeType",
        headerName: "Tipo beneficiario",
        sortable: true,
        width: 140,
        valueGetter: ({ row }) => labelAccountsPayablePayeeType((row as AccountsPayableRow).payeeType),
      },
      {
        field: "installmentNumber",
        headerName: "Cuota",
        sortable: true,
        width: 90,
        align: "center",
        valueGetter: ({ row }) => {
          const r = row as AccountsPayableRow;
          if (!r.totalInstallments || r.totalInstallments <= 1) return "Única";
          return `${r.installmentNumber}/${r.totalInstallments}`;
        },
      },
      {
        field: "pendingAmount",
        headerName: "Pendiente",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as AccountsPayableRow).pendingAmount),
      },
      {
        field: "dueDate",
        headerName: "Vencimiento",
        sortable: true,
        width: 120,
        valueGetter: ({ row }) => fmtDate((row as AccountsPayableRow).dueDate),
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: true,
        width: 120,
        renderCell: ({ row }) => {
          const r = row as AccountsPayableRow;
          return <StatusBadge status={r.status} isOverdue={r.isOverdue} />;
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 92,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          const r = row as AccountsPayableRow;
          return (
            <div className="flex items-center justify-center gap-1">
              <IconButton
                icon="HandCoins"
                variant="action"
                size="sm"
                title="Pagar"
                ariaLabel="Pagar"
                onClick={() => setPayRow(r)}
                data-test-id="accounts-payable-pay-btn"
              />
              <IconButton
                icon="MoreHorizontal"
                variant="action"
                size="sm"
                title="Ver detalle"
                ariaLabel="Ver detalle del pago"
                onClick={() => setDetailsRow(r)}
                data-test-id="accounts-payable-details-btn"
              />
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex items-center justify-end gap-2 px-1">
          <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
            <ButtonPill
              variant={view === "grid" ? "primary" : "outlined"}
              onClick={() => setView("grid")}
              className="text-xs px-3 py-1"
              data-test-id="accounts-payable-view-grid"
            >
              Tabla
            </ButtonPill>
            <ButtonPill
              variant={view === "calendar" ? "primary" : "outlined"}
              onClick={() => setView("calendar")}
              className="text-xs px-3 py-1"
              data-test-id="accounts-payable-view-calendar"
            >
              Calendario
            </ButtonPill>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {view === "grid" ? (
            <DataGrid
              columns={columns}
              rows={rows}
              totalRows={rows.length}
              totalGeneral={rows.length}
              fillViewport
              showExportButton={false}
              showSortButton={false}
              showFilterButton={false}
              showFooter
              pinActionsColumn
              data-test-id="accounts-payable-data-grid"
            />
          ) : (
            <AccountsPayableCalendar
              rows={rows}
              onPay={(r) => setPayRow(r)}
              onDetails={(r) => setDetailsRow(r)}
            />
          )}
        </div>
      </div>
      <CompleteAccountsPayablePaymentDialog
        open={Boolean(payRow)}
        row={payRow}
        onClose={() => setPayRow(null)}
        onSuccess={() => router.refresh()}
      />
      <AccountsPayablePaymentDetailsDialog
        open={Boolean(detailsRow)}
        row={detailsRow}
        onClose={() => setDetailsRow(null)}
      />
    </>
  );
}
