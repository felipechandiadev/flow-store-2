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

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING_APPROVAL: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  CANCELLED: "Anulado",
};

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
        field: "status",
        headerName: "Estado",
        sortable: true,
        width: 130,
        valueGetter: ({ row }) => STATUS_LABEL[(row as OperationalExpenseGridRow).status] ?? (row as OperationalExpenseGridRow).status,
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

