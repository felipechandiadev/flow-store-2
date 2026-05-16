"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import type { ReceptionGridRow } from "@/features/receptions/types/reception.types";

type ReceptionsDataGridProps = {
  rows: ReceptionGridRow[];
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

const TYPE_LABEL: Record<string, string> = {
  direct: "Directa",
  "from-purchase-order": "Desde OC",
};

export default function ReceptionsDataGrid({ rows, total }: ReceptionsDataGridProps) {
  const router = useRouter();

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "documentNumber",
        headerName: "Documento / ref.",
        sortable: false,
        minWidth: 160,
        flex: 0.9,
        valueGetter: ({ row }) => String((row as ReceptionGridRow).documentNumber || "—"),
      },
      {
        field: "createdAt",
        headerName: "Registro",
        sortable: false,
        width: 160,
        valueGetter: ({ row }) => formatDateTimeSlash((row as ReceptionGridRow).createdAt),
      },
      {
        field: "supplierName",
        headerName: "Proveedor",
        sortable: false,
        minWidth: 200,
        flex: 1.1,
        valueGetter: ({ row }) => String((row as ReceptionGridRow).supplierName || "—"),
      },
      {
        field: "storageName",
        headerName: "Almacén",
        sortable: false,
        minWidth: 140,
        flex: 0.8,
        valueGetter: ({ row }) => String((row as ReceptionGridRow).storageName || "—"),
      },
      {
        field: "type",
        headerName: "Origen",
        sortable: false,
        width: 130,
        valueGetter: ({ row }) => {
          const k = String((row as ReceptionGridRow).type || "");
          return TYPE_LABEL[k] ?? (k || "—");
        },
      },
    ],
    [],
  );

  return (
    <DataGrid
      title="Recepciones"
      columns={columns}
      rows={rows}
      totalRows={total}
      totalGeneral={total}
      height="85vh"
      showExportButton={false}
      showSortButton={false}
      showFilterButton={false}
      showSearch={false}
      onAddClick={() => router.push("/purchasing/transactions/receptions/new")}
      data-test-id="receptions-data-grid"
    />
  );
}
