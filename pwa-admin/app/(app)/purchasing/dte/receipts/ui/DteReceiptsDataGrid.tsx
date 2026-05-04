"use client";

import { useMemo } from "react";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import { CreateReceiptPlaceholderForm } from "./CreateReceiptPlaceholderForm";

type ReceiptRow = { id: string; createdAt?: string; status?: string; total?: number };

type DteReceiptsDataGridProps = {
  rows: ReceiptRow[];
  total: number;
};

export default function DteReceiptsDataGrid({ rows, total }: DteReceiptsDataGridProps) {
  const columns: DataGridColumn[] = useMemo(
    () => [
      { field: "documentNumber", headerName: "Folio", sortable: false, minWidth: 140, flex: 0.7 },
      { field: "createdAt", headerName: "Registro", sortable: false, width: 160 },
      { field: "supplierName", headerName: "Proveedor", sortable: false, minWidth: 200, flex: 1.2 },
      { field: "total", headerName: "Total", sortable: false, width: 120, align: "right" },
      { field: "status", headerName: "Estado", sortable: false, width: 120 },
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
      createFormTitle="Crear boleta"
      createForm={<CreateReceiptPlaceholderForm />}
      data-test-id="dte-receipts-data-grid"
    />
  );
}
