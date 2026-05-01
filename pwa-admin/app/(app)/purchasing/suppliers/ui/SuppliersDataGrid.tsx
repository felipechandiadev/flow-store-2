"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";
import { CreateSupplierDialog } from "./CreateSupplierDialog";

type SuppliersDataGridProps = {
  rows: SupplierGridRow[];
  total: number;
};

const SUPPLIER_TYPE_LABEL: Record<string, string> = {
  MANUFACTURER: "Fabricante",
  DISTRIBUTOR: "Distribuidor",
  WHOLESALER: "Mayorista",
  SERVICE_PROVIDER: "Proveedor de servicios",
  CONTRACTOR: "Contratista",
  LOGISTICS: "Logística",
  IMPORTER: "Importador",
};

function displayName(row: SupplierGridRow): string {
  const p = row.person;
  if (!p) {
    return row.alias?.trim() || "—";
  }
  const alias = row.alias?.trim();
  if (alias) {
    return alias;
  }
  const business = p.businessName?.trim();
  if (business) {
    return business;
  }
  const full = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return full || "—";
}

function titularLabel(row: SupplierGridRow): string {
  const t = row.person?.type;
  if (t === "COMPANY") {
    return "Empresa";
  }
  return "Persona";
}

function documentLine(row: SupplierGridRow): string {
  const p = row.person;
  if (!p?.documentNumber?.trim()) {
    return "—";
  }
  const dt = p.documentType?.trim() || "—";
  return `${dt}: ${p.documentNumber}`;
}

export default function SuppliersDataGrid({ rows, total }: SuppliersDataGridProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "displayName",
        headerName: "Nombre / Razón social",
        sortable: false,
        minWidth: 220,
        flex: 1,
        valueGetter: ({ row }) => displayName(row as SupplierGridRow),
      },
      {
        field: "titular",
        headerName: "Titular",
        sortable: false,
        width: 110,
        valueGetter: ({ row }) => titularLabel(row as SupplierGridRow),
      },
      {
        field: "document",
        headerName: "Documento",
        sortable: false,
        minWidth: 140,
        valueGetter: ({ row }) => documentLine(row as SupplierGridRow),
      },
      {
        field: "supplierType",
        headerName: "Categoría",
        sortable: true,
        width: 180,
        valueGetter: ({ row }) => {
          const st = (row as SupplierGridRow).supplierType;
          return SUPPLIER_TYPE_LABEL[st] ?? st;
        },
      },
      {
        field: "defaultPaymentTermDays",
        headerName: "Plazo (días)",
        width: 110,
        align: "right",
        valueGetter: ({ row }) => String((row as SupplierGridRow).defaultPaymentTermDays ?? 0),
      },
      {
        field: "isActive",
        headerName: "Activo",
        width: 90,
        valueGetter: ({ row }) => (row as SupplierGridRow).isActive,
        renderCell: ({ value }) => (
          <span className={value ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
            {value ? "Sí" : "No"}
          </span>
        ),
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
        title="Proveedores"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        height="85vh"
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        onAddClick={() => setCreateOpen(true)}
        data-test-id="suppliers-data-grid"
      />
      <CreateSupplierDialog open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={onSuccess} />
    </>
  );
}
