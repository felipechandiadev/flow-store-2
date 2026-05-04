"use client";

import { useMemo } from "react";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import type { SupplierReceiptListItem } from "@/features/purchasing-supplier-receipts/types/supplier-receipt.types";
import { dteFolioDisplay } from "@/features/purchasing-dte/lib/dte-folio-display";
import { CreateSupplierReceiptDialogForm } from "./CreateSupplierReceiptDialogForm";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTimeSlash(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "—";
  }
  const dt = new Date(value.trim());
  if (Number.isNaN(dt.getTime())) {
    return "—";
  }
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

type DteReceiptsDataGridProps = {
  rows: SupplierReceiptListItem[];
  total: number;
};

export default function DteReceiptsDataGrid({ rows, total }: DteReceiptsDataGridProps) {
  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "documentNumber",
        headerName: "Folio",
        sortable: true,
        minWidth: 140,
        flex: 0.7,
        valueGetter: ({ row }) => {
          const r = row as SupplierReceiptListItem;
          return r.documentNumber || r.id?.slice(0, 8) || "—";
        },
      },
      {
        field: "createdAt",
        headerName: "Registro",
        sortable: true,
        width: 160,
        valueGetter: ({ row }) => formatDateTimeSlash((row as SupplierReceiptListItem).createdAt),
      },
      {
        field: "supplierName",
        headerName: "Proveedor",
        sortable: false,
        minWidth: 200,
        flex: 1.2,
        valueGetter: ({ row }) => {
          const r = row as SupplierReceiptListItem;
          const person = r.supplier?.person;
          return (
            person?.businessName ||
            [person?.firstName, person?.lastName].filter(Boolean).join(" ") ||
            r.supplier?.id ||
            "—"
          );
        },
      },
      {
        field: "dteFolio",
        headerName: "Folio DTE",
        sortable: false,
        width: 140,
        valueGetter: ({ row }) => dteFolioDisplay(row as SupplierReceiptListItem),
      },
      {
        field: "subtotal",
        headerName: "Neto",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => formatMoney(Number((row as SupplierReceiptListItem).subtotal ?? 0)),
      },
      {
        field: "total",
        headerName: "Total",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => formatMoney(Number((row as SupplierReceiptListItem).total ?? 0)),
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 120,
        valueGetter: ({ row }) => String((row as SupplierReceiptListItem).status || "—"),
      },
    ],
    [],
  );

  return (
    <DataGrid
      title="Boletas"
      columns={columns}
      rows={rows}
      totalRows={total}
      totalGeneral={total}
      height="85vh"
      showExportButton={false}
      showSortButton={false}
      showFilterButton={false}
      createFormTitle="Ingresar Boleta"
      createForm={<CreateSupplierReceiptDialogForm />}
      data-test-id="dte-receipts-data-grid"
    />
  );
}
