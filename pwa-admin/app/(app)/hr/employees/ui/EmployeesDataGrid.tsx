"use client";

import { useMemo } from "react";
import Link from "next/link";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import type { EmployeeGridRow } from "@/features/hr-employees/types/employee.types";

type EmployeesDataGridProps = {
  rows: EmployeeGridRow[];
  includeTerminated: boolean;
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

export default function EmployeesDataGrid({ rows, includeTerminated }: EmployeesDataGridProps) {
  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "personId",
        headerName: "Persona (ID)",
        sortable: false,
        minWidth: 280,
        flex: 1,
      },
      {
        field: "hireDate",
        headerName: "Ingreso",
        sortable: false,
        width: 120,
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
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 120,
        valueGetter: ({ row }) => {
          const k = String((row as EmployeeGridRow).status || "");
          return STATUS_LABEL[k] ?? (k || "—");
        },
      },
      {
        field: "branchId",
        headerName: "Sucursal (ID)",
        sortable: false,
        minWidth: 200,
        flex: 0.8,
        valueGetter: ({ row }) => String((row as EmployeeGridRow).branchId || "—"),
      },
    ],
    [],
  );

  const toggleHref = includeTerminated ? "/hr/employees" : "/hr/employees?includeTerminated=1";
  const toggleLabel = includeTerminated ? "Ocultar terminados" : "Incluir terminados";

  return (
    <DataGrid
      title="Empleados"
      columns={columns}
      rows={rows}
      totalRows={rows.length}
      totalGeneral={rows.length}
      height="85vh"
      showExportButton={false}
      showSortButton={false}
      showFilterButton={false}
      showSearch={false}
      showFooter={false}
      headerActions={
        <Link
          href={toggleHref}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          data-test-id="employees-toggle-terminated"
        >
          {toggleLabel}
        </Link>
      }
      data-test-id="employees-data-grid"
    />
  );
}
