"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import type {
  ExpenseCategoryOption,
  OperationalExpenseGridRow,
  SupplierOption,
} from "@/features/treasury-expenses/types/operational-expense.types";
import { CreateOperationalExpenseDialog } from "./CreateOperationalExpenseDialog";

type ExpensesDataGridProps = {
  rows: OperationalExpenseGridRow[];
  total: number;
  categories: ExpenseCategoryOption[];
  suppliers: SupplierOption[];
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

export default function ExpensesDataGrid({ rows, total, categories, suppliers }: ExpensesDataGridProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        sortable: true,
        minWidth: 180,
      },
      {
        field: "referenceNumber",
        headerName: "Referencia",
        sortable: true,
        minWidth: 160,
        valueGetter: ({ row }) => (row as OperationalExpenseGridRow).referenceNumber || "—",
      },
      {
        field: "supplierName",
        headerName: "Proveedor",
        sortable: false,
        minWidth: 180,
        valueGetter: ({ row }) => {
          const r = row as OperationalExpenseGridRow;
          const s = suppliers.find((x) => x.id === r.supplierId);
          return s?.name ?? "—";
        },
      },
      {
        field: "operationDate",
        headerName: "Fecha",
        sortable: true,
        width: 120,
      },
      {
        field: "categoryName",
        headerName: "Categoría",
        sortable: true,
        minWidth: 220,
        flex: 1,
      },
      {
        field: "netAmount",
        headerName: "Neto",
        sortable: false,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as OperationalExpenseGridRow).netAmount),
      },
      {
        field: "taxAmount",
        headerName: "Impuestos",
        sortable: false,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as OperationalExpenseGridRow).taxAmount),
      },
      {
        field: "totalAmount",
        headerName: "Total",
        sortable: false,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as OperationalExpenseGridRow).totalAmount),
      },
      {
        field: "description",
        headerName: "Descripción",
        sortable: false,
        minWidth: 240,
        flex: 1,
        valueGetter: ({ row }) => (row as OperationalExpenseGridRow).description || "—",
      },
    ],
    [],
  );

  const onSuccess = useCallback(async () => {
    await router.refresh();
  }, [router]);

  return (
    <>
      <DataGrid
        title="Gastos operativos"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        height="85vh"
        showExportButton={false}
        showFilterButton={false}
        showSortButton={false}
        onAddClick={() => setCreateOpen(true)}
        data-test-id="operational-expenses-data-grid"
      />
      <CreateOperationalExpenseDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={onSuccess}
        categoryOptions={categories}
        supplierOptions={suppliers}
      />
    </>
  );
}

