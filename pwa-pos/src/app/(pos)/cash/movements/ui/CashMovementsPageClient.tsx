"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, type DataGridColumn, Alert, IconButton, DotProgress } from "@/shared/admin-shared";
import { listCashSessionMovementsAction } from "@/features/session/actions/cash-session-movements.action";
import type { CashSessionMovementRow } from "@/features/session/types/cash-session-movement.types";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateTimeLocal(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function transactionTypeLabel(t: string): string {
  const map: Record<string, string> = {
    SALE: "Venta",
    SALE_RETURN: "Devolución de venta",
    CASH_SESSION_OPENING: "Apertura de caja",
    CASH_SESSION_CLOSING: "Cierre de caja",
    CASH_SESSION_DEPOSIT: "Ingreso de efectivo",
    CASH_SESSION_WITHDRAWAL: "Retiro de efectivo",
    CASH_SESSION_TO_HUB_TRANSFER: "Transferencia a centro de acopio",
    PAYMENT_IN: "Cobro",
    SUPPLIER_PAYMENT: "Pago proveedor",
    PAYROLL_PAYMENT: "Pago nómina",
    EXPENSE_PAYMENT: "Pago gasto",
    BANK_TO_CASH_TRANSFER: "Banco a caja",
    OPERATING_EXPENSE: "Gasto operativo",
    CASH_DEPOSIT: "Depósito en banco",
  };
  return map[t] ?? t;
}

function directionLabel(d: CashSessionMovementRow["direction"]): string {
  if (d === "IN") return "Entrada";
  if (d === "OUT") return "Salida";
  return "—";
}

const currencyFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default function CashMovementsPageClient() {
  const router = useRouter();
  const [cashSessionId, setCashSessionId] = useState<string | null>(null);
  const [rows, setRows] = useState<CashSessionMovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctx = readPosContextClient();
    const id = typeof ctx?.cashSessionId === "string" ? ctx.cashSessionId.trim() : "";
    setCashSessionId(id || null);
  }, []);

  const load = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    const res = await listCashSessionMovementsAction(sessionId);
    setLoading(false);
    if (!res.success) {
      setRows([]);
      setError(res.message);
      return;
    }
    setRows(res.movements);
  }, []);

  useEffect(() => {
    if (cashSessionId === null) return;
    if (!cashSessionId) {
      setLoading(false);
      setRows([]);
      setError("No hay sesión de caja activa. Configura el punto de venta y abre caja desde la pantalla inicial.");
      return;
    }
    void load(cashSessionId);
  }, [cashSessionId, load]);

  const gridRows = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        typeLabel: transactionTypeLabel(r.transactionType),
        directionLabel: directionLabel(r.direction),
        createdAtLabel: formatDateTimeLocal(r.createdAt),
        totalLabel: currencyFmt.format(Number(r.total) || 0),
      })),
    [rows],
  );

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "createdAtLabel",
        headerName: "Fecha y hora",
        minWidth: 150,
        flex: 1,
        sortable: false,
        filterable: false,
      },
      {
        field: "documentNumber",
        headerName: "Documento",
        minWidth: 110,
        flex: 0.8,
        sortable: false,
        filterable: false,
      },
      {
        field: "typeLabel",
        headerName: "Tipo",
        minWidth: 160,
        flex: 1.2,
        sortable: false,
        filterable: false,
      },
      {
        field: "directionLabel",
        headerName: "Sentido",
        minWidth: 90,
        flex: 0.6,
        sortable: false,
        filterable: false,
      },
      {
        field: "totalLabel",
        headerName: "Total",
        minWidth: 110,
        flex: 0.8,
        align: "right",
        headerAlign: "right",
        sortable: false,
        filterable: false,
      },
      {
        field: "paymentMethod",
        headerName: "Medio de pago",
        minWidth: 110,
        flex: 0.9,
        sortable: false,
        filterable: false,
      },
      {
        field: "userFullName",
        headerName: "Usuario",
        minWidth: 140,
        flex: 1,
        sortable: false,
        filterable: false,
        valueGetter: ({ row }: { row: { userFullName: string | null; userUserName: string | null } }) =>
          row.userFullName?.trim() || row.userUserName?.trim() || "—",
      },
      {
        field: "notes",
        headerName: "Notas",
        minWidth: 120,
        flex: 1,
        sortable: false,
        filterable: false,
        valueGetter: ({ value }: { value: string | null }) => (value && String(value).trim() ? String(value) : "—"),
      },
    ],
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-foreground)" }}>
            Movimientos de caja
          </h1>
          <p className="mt-1 text-xs sm:text-sm" style={{ color: "var(--color-muted-foreground)" }}>
            Movimientos de la sesión de caja abierta en este dispositivo. El más reciente aparece primero.
          </p>
        </div>
        <IconButton
          icon="ArrowLeft"
          variant="basic"
          size="md"
          ariaLabel="Volver al punto de venta"
          title="Volver al punto de venta"
          onClick={() => router.push("/pos")}
          data-test-id="cash-movements-back-pos"
        />
      </div>

      {error ? (
        <Alert variant="warning" data-test-id="cash-movements-error">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <DotProgress />
        </div>
      ) : (
        <DataGrid
          columns={columns}
          title=""
          rows={gridRows}
          totalRows={gridRows.length}
          height="min(70vh, 640px)"
          showSearch={false}
          showSortButton={false}
          showFilterButton={false}
          showExportButton={false}
          showFooter={false}
          data-test-id="cash-movements-grid"
        />
      )}
    </div>
  );
}
