"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import type { PurchaseReturnListItem } from "@/features/purchasing-purchase-returns/types/purchase-return.types";

export type PurchaseReturnGridRow = PurchaseReturnListItem & {
  supplierName: string;
};

type PurchaseReturnsDataGridProps = {
  rows: PurchaseReturnGridRow[];
  total: number;
};

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

export default function PurchaseReturnsDataGrid({ rows, total }: PurchaseReturnsDataGridProps) {
  const router = useRouter();

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "createdAt",
        headerName: "Fecha",
        sortable: false,
        width: 160,
        valueGetter: ({ row }) => formatDateTimeSlash((row as PurchaseReturnGridRow).createdAt),
      },
      {
        field: "supplierName",
        headerName: "Proveedor",
        sortable: false,
        minWidth: 200,
        flex: 1.2,
      },
      {
        field: "externalReference",
        headerName: "Referencia",
        sortable: false,
        minWidth: 140,
        flex: 0.8,
        valueGetter: ({ row }) => String((row as PurchaseReturnGridRow).externalReference || "—"),
      },
      {
        field: "total",
        headerName: "Total",
        sortable: false,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => formatMoney(Number((row as PurchaseReturnGridRow).total ?? 0)),
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 120,
        valueGetter: ({ row }) => String((row as PurchaseReturnGridRow).status || "—"),
      },
    ],
    [],
  );

  return (
    <DataGrid
      title="Devoluciones de compra"
      columns={columns}
      rows={rows}
      totalRows={total}
      totalGeneral={total}
      height="85vh"
      showExportButton={false}
      showSortButton={false}
      showFilterButton={false}
      onAddClick={() => router.push("/purchasing/transactions/purchase-returns/new")}
      data-test-id="purchase-returns-data-grid"
    />
  );
}
