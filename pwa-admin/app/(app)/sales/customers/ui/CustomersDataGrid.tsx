"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import type { CustomerListRow } from "@/features/sales-customers/types/customer.types";
import { CreateCustomerDialog } from "./CreateCustomerDialog";

type CustomersDataGridProps = {
  rows: CustomerListRow[];
  total: number;
  internalCreditEnabled?: boolean;
};

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDateShort(iso?: string): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleDateString("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function CustomersDataGrid({
  rows,
  total,
  internalCreditEnabled = true,
}: CustomersDataGridProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const columns: DataGridColumn[] = useMemo(() => {
    const base: DataGridColumn[] = [
      {
        field: "displayName",
        headerName: "Nombre",
        sortable: false,
        minWidth: 200,
        flex: 1,
        valueGetter: ({ row }) => (row as CustomerListRow).displayName || "—",
      },
      {
        field: "documentNumber",
        headerName: "Documento",
        sortable: false,
        minWidth: 130,
        valueGetter: ({ row }) => (row as CustomerListRow).documentNumber?.trim() || "—",
      },
      {
        field: "email",
        headerName: "Correo",
        sortable: false,
        minWidth: 160,
        flex: 0.8,
        valueGetter: ({ row }) => (row as CustomerListRow).email?.trim() || "—",
      },
      {
        field: "phone",
        headerName: "Teléfono",
        sortable: false,
        width: 120,
        valueGetter: ({ row }) => (row as CustomerListRow).phone?.trim() || "—",
      },
    ];
    if (internalCreditEnabled) {
      base.push(
        {
          field: "creditLimit",
          headerName: "Límite crédito",
          sortable: false,
          width: 130,
          align: "right",
          valueGetter: ({ row }) => fmtClp(Number((row as CustomerListRow).creditLimit ?? 0)),
        },
        {
          field: "availableCredit",
          headerName: "Crédito disponible",
          sortable: false,
          width: 140,
          align: "right",
          valueGetter: ({ row }) =>
            fmtClp(Number((row as CustomerListRow).availableCredit ?? 0)),
        },
        {
          field: "paymentDayOfMonth",
          headerName: "Día pago",
          width: 90,
          align: "right",
          valueGetter: ({ row }) => String((row as CustomerListRow).paymentDayOfMonth ?? "—"),
        },
      );
    }
    base.push(
      {
        field: "isActive",
        headerName: "Activo",
        width: 80,
        valueGetter: ({ row }) => (row as CustomerListRow).isActive,
        renderCell: ({ value }) => (
          <span className={value ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
            {value ? "Sí" : "No"}
          </span>
        ),
      },
      {
        field: "createdAt",
        headerName: "Alta",
        sortable: false,
        width: 110,
        valueGetter: ({ row }) => formatDateShort((row as CustomerListRow).createdAt),
      },
    );
    return base;
  }, [internalCreditEnabled]);

  const onSuccess = useCallback(async () => {
    await router.refresh();
  }, [router]);

  return (
    <>
      <DataGrid
        title="Clientes"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        height="85vh"
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        onAddClick={() => setCreateOpen(true)}
        data-test-id="customers-data-grid"
      />
      <CreateCustomerDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={onSuccess}
        internalCreditEnabled={internalCreditEnabled}
      />
    </>
  );
}
