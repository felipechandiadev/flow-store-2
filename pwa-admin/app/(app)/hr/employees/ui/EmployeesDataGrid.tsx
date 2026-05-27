"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import Badge, { type BadgeVariant } from "@/shared/components/Badge/Badge";
import type { EmployeeGridRow } from "@/features/hr-employees/types/employee.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { CreateEmployeeDialog } from "./CreateEmployeeDialog";

type EmployeesDataGridProps = {
  rows: EmployeeGridRow[];
  total: number;
  branches: BranchListItem[];
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateOnlySlash(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "—";
  }
  const trimmed = value.trim();
  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, y, m, d] = isoDate;
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(trimmed);
  if (Number.isNaN(dt.getTime())) {
    return "—";
  }
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

function formatMoneyClp(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") {
    return "—";
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "—";
  }
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function displayName(row: EmployeeGridRow): string {
  const p = row.person;
  if (!p) {
    return row.personId?.trim() || "—";
  }
  const business = p.businessName?.trim();
  if (business) {
    return business;
  }
  const full = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return full || "—";
}

function documentLine(row: EmployeeGridRow): string {
  const p = row.person;
  if (!p?.documentNumber?.trim()) {
    return "—";
  }
  const dt = p.documentType?.trim() || "—";
  return `${dt}: ${p.documentNumber}`;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
  TERMINATED: "Terminado",
};

const EMPLOYMENT_LABEL: Record<string, string> = {
  FULL_TIME: "Jornada completa",
  PART_TIME: "Part time",
  CONTRACTOR: "Contratista",
  TEMPORARY: "Temporal",
  INTERN: "Práctica",
};

function statusBadgeVariant(status: string): BadgeVariant {
  if (status === "ACTIVE") return "success-outlined";
  if (status === "SUSPENDED") return "warning-outlined";
  if (status === "TERMINATED") return "secondary-outlined";
  return "secondary-outlined";
}

export default function EmployeesDataGrid({ rows, total, branches }: EmployeesDataGridProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const onSuccess = useCallback(async () => {
    await router.refresh();
  }, [router]);

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "displayName",
        headerName: "Nombre",
        sortable: false,
        minWidth: 220,
        flex: 1,
        valueGetter: ({ row }) => displayName(row as EmployeeGridRow),
      },
      {
        field: "document",
        headerName: "Documento",
        sortable: false,
        minWidth: 150,
        width: 170,
        valueGetter: ({ row }) => documentLine(row as EmployeeGridRow),
      },
      {
        field: "email",
        headerName: "Correo",
        sortable: false,
        minWidth: 180,
        flex: 0.9,
        valueGetter: ({ row }) => (row as EmployeeGridRow).person?.email?.trim() || "—",
      },
      {
        field: "phone",
        headerName: "Teléfono",
        sortable: false,
        width: 130,
        valueGetter: ({ row }) => (row as EmployeeGridRow).person?.phone?.trim() || "—",
      },
      {
        field: "branchName",
        headerName: "Sucursal",
        sortable: false,
        minWidth: 160,
        flex: 0.8,
        valueGetter: ({ row }) => (row as EmployeeGridRow).branch?.name?.trim() || "—",
      },
      {
        field: "hireDate",
        headerName: "Ingreso",
        sortable: false,
        width: 110,
        valueGetter: ({ row }) => formatDateOnlySlash((row as EmployeeGridRow).hireDate),
      },
      {
        field: "employmentType",
        headerName: "Contrato",
        sortable: false,
        width: 150,
        valueGetter: ({ row }) => {
          const k = String((row as EmployeeGridRow).employmentType || "");
          return EMPLOYMENT_LABEL[k] ?? (k || "—");
        },
      },
      {
        field: "baseSalary",
        headerName: "Sueldo base",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) => formatMoneyClp((row as EmployeeGridRow).baseSalary),
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 120,
        valueGetter: ({ row }) => String((row as EmployeeGridRow).status || ""),
        renderCell: ({ value }) => {
          const key = String(value || "");
          const label = STATUS_LABEL[key] ?? (key || "—");
          return (
            <Badge variant={statusBadgeVariant(key)} size="sm">
              {label}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  return (
    <>
      <DataGrid
        title="Empleados"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        height="85vh"
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        showSearch={false}
        onAddClick={() => setCreateOpen(true)}
        data-test-id="employees-data-grid"
      />
      <CreateEmployeeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={onSuccess}
        branches={branches}
      />
    </>
  );
}
