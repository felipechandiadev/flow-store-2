"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import Badge from "@/shared/components/Badge/Badge";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import { Select, type Option } from "@/shared/components/Select";
import type { StockGridRow, StockStorageBreakdownRow } from "@/features/inventory-stock/types/stock-grid.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { adjustStockAction, transferStockAction } from "@/features/inventory-stock/actions/stock.action";

type StockDataGridProps = {
  rows: StockGridRow[];
  total: number;
  storages: StorageListItem[];
  /** When set, expand cards only list storages belonging to this branch. */
  branchId?: string;
};

function formatQty(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(n);
}

function formatMoney(n: number): string {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
      Math.round(n),
    );
  } catch {
    return String(Math.round(n));
  }
}

function formatAttrs(av: Record<string, string>): string {
  const v = Object.values(av).filter((x) => x.trim());
  return v.length > 0 ? v.join(" · ") : "—";
}

/**
 * One card per warehouse: merge catalog storages with API breakdown (quantities),
 * append any breakdown-only storages (e.g. inactive / not in list).
 */
function mergeStoragesWithBreakdown(
  storages: StorageListItem[],
  breakdown: StockStorageBreakdownRow[],
  branchId?: string,
): StockStorageBreakdownRow[] {
  const byId = new Map(breakdown.map((b) => [b.storageId, b]));
  const active = storages.filter((s) => s.isActive !== false);
  const scoped = branchId
    ? active.filter((s) => (s.branchId ?? s.branch?.id ?? "") === branchId)
    : active;

  const sortedCatalog = [...scoped].sort((a, b) => {
    if (a.isDefault !== b.isDefault) {
      return a.isDefault ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
  });

  if (sortedCatalog.length === 0) {
    return [...breakdown].sort((a, b) =>
      a.storageName.localeCompare(b.storageName, "es", { sensitivity: "base" }),
    );
  }

  const fromCatalog: StockStorageBreakdownRow[] = sortedCatalog.map((s) => {
    const existing = byId.get(s.id);
    if (existing) {
      return existing;
    }
    return {
      storageId: s.id,
      storageName: s.name,
      branchName: s.branch?.name ?? null,
      quantity: 0,
      availableStock: 0,
      committedStock: 0,
    };
  });

  const ids = new Set(fromCatalog.map((c) => c.storageId));
  const extras = breakdown
    .filter((b) => !ids.has(b.storageId))
    .sort((a, b) => a.storageName.localeCompare(b.storageName, "es", { sensitivity: "base" }));

  return [...fromCatalog, ...extras];
}

function StockStorageFilter({ storages }: { storages: StorageListItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("storageId") || "";
  const options: Option[] = useMemo(
    () => storages.filter((s) => s.isActive !== false).map((s) => ({ id: s.id, label: s.name })),
    [storages],
  );

  const apply = (storageId: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (storageId) {
      next.set("storageId", storageId);
    } else {
      next.delete("storageId");
    }
    next.set("page", "1");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?page=1", { scroll: false });
  };

  return (
    <div className="min-w-[12rem] max-w-xs" data-test-id="stock-grid-storage-filter">
      <Select
        label="Almacén"
        name="stock-storage-filter"
        placeholder="Todos"
        options={options}
        value={current || null}
        onChange={(id) => apply(id == null ? null : String(id))}
        allowClear
        data-test-id="stock-storage-filter-select"
      />
    </div>
  );
}

type AdjustState = {
  open: boolean;
  variantId: string;
  storageId: string;
  title: string;
  currentQty: number;
  targetQty: string;
  note: string;
};

type TransferState = {
  open: boolean;
  variantId: string;
  sourceStorageId: string;
  sourceLabel: string;
  quantity: string;
  targetStorageId: string | null;
  note: string;
};

function StockStorageCard({
  row,
  b,
  onAdjust,
  onTransfer,
}: {
  row: StockGridRow;
  b: StockStorageBreakdownRow;
  onAdjust: (p: { variantId: string; storageId: string; title: string; currentQty: number }) => void;
  onTransfer: (p: { variantId: string; sourceStorageId: string; sourceLabel: string }) => void;
}) {
  const title = [b.storageName, b.branchName].filter(Boolean).join(" · ");
  return (
    <article
      className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-background p-3 shadow-sm"
      data-test-id={`stock-storage-card-${row.variantId}-${b.storageId}`}
    >
      <div className="min-w-0">
        <h4 className="truncate text-sm font-semibold text-foreground" title={title}>
          {b.storageName}
        </h4>
        {b.branchName ? <p className="text-xs text-muted-foreground">{b.branchName}</p> : null}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Físico</dt>
        <dd className="text-right font-mono tabular-nums text-foreground">{formatQty(b.quantity)}</dd>
        <dt className="text-muted-foreground">Disponible</dt>
        <dd className="text-right font-mono tabular-nums text-foreground">{formatQty(b.availableStock)}</dd>
        {b.committedStock > 0 ? (
          <>
            <dt className="text-muted-foreground">Comprometido</dt>
            <dd className="text-right font-mono tabular-nums text-foreground">{formatQty(b.committedStock)}</dd>
          </>
        ) : null}
      </dl>
      <div className="mt-1 flex flex-wrap gap-1 border-t border-border pt-2">
        <Button
          variant="outlined"
          size="sm"
          onClick={() =>
            onAdjust({
              variantId: row.variantId,
              storageId: b.storageId,
              title,
              currentQty: b.quantity,
            })
          }
          data-test-id={`stock-adjust-open-${b.storageId}`}
        >
          Ajustar
        </Button>
        <Button
          variant="outlined"
          size="sm"
          onClick={() =>
            onTransfer({
              variantId: row.variantId,
              sourceStorageId: b.storageId,
              sourceLabel: title,
            })
          }
          data-test-id={`stock-transfer-open-${b.storageId}`}
        >
          Transferir
        </Button>
      </div>
    </article>
  );
}

function StockExpandPanel({
  row,
  storages,
  branchId,
  onAdjust,
  onTransfer,
}: {
  row: StockGridRow;
  storages: StorageListItem[];
  branchId?: string;
  onAdjust: (p: { variantId: string; storageId: string; title: string; currentQty: number }) => void;
  onTransfer: (p: { variantId: string; sourceStorageId: string; sourceLabel: string }) => void;
}) {
  const cards = useMemo(
    () => mergeStoragesWithBreakdown(storages, row.storageBreakdown ?? [], branchId),
    [storages, row.storageBreakdown, branchId],
  );

  return (
    <div className="w-full min-w-0 max-w-none py-1" data-test-id={`stock-expand-${row.variantId}`}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Stock por almacén
      </p>
      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay almacenes configurados.</p>
      ) : (
        <div className="grid max-h-[min(24rem,55vh)] w-full grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((b) => (
            <StockStorageCard key={b.storageId} row={row} b={b} onAdjust={onAdjust} onTransfer={onTransfer} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StockDataGrid({ rows, total, storages, branchId }: StockDataGridProps) {
  const router = useRouter();
  const [adjust, setAdjust] = useState<AdjustState | null>(null);
  const [transfer, setTransfer] = useState<TransferState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openAdjust = useCallback(
    (p: { variantId: string; storageId: string; title: string; currentQty: number }) => {
      setError(null);
      setAdjust({
        open: true,
        variantId: p.variantId,
        storageId: p.storageId,
        title: p.title,
        currentQty: p.currentQty,
        targetQty: String(Math.max(0, Math.round(p.currentQty * 1000) / 1000)),
        note: "",
      });
    },
    [],
  );

  const openTransfer = useCallback((p: { variantId: string; sourceStorageId: string; sourceLabel: string }) => {
    setError(null);
    const others = storages.filter((s) => s.id !== p.sourceStorageId && s.isActive !== false);
    setTransfer({
      open: true,
      variantId: p.variantId,
      sourceStorageId: p.sourceStorageId,
      sourceLabel: p.sourceLabel,
      quantity: "1",
      targetStorageId: others[0]?.id ?? null,
      note: "",
    });
  }, [storages]);

  const transferTargetOptions: Option[] = useMemo(() => {
    if (!transfer) {
      return [];
    }
    return storages
      .filter((s) => s.id !== transfer.sourceStorageId && s.isActive !== false)
      .map((s) => ({ id: s.id, label: s.name }));
  }, [storages, transfer]);

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "productName",
        headerName: "Producto",
        sortable: true,
        minWidth: 200,
        flex: 1,
        renderCell: ({ row }) => {
          const r = row as StockGridRow;
          return (
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground" title={r.productName}>
                {r.productName}
              </p>
              <p className="truncate text-xs text-muted-foreground">{formatAttrs(r.attributeValues)}</p>
            </div>
          );
        },
      },
      { field: "sku", headerName: "SKU", sortable: true, width: 120 },
      {
        field: "totalStock",
        headerName: "Stock total",
        sortable: true,
        width: 110,
        align: "right",
        renderCell: ({ value }) => <span className="font-mono tabular-nums">{formatQty(Number(value) || 0)}</span>,
      },
      {
        field: "availableStock",
        headerName: "Disponible",
        sortable: true,
        width: 110,
        align: "right",
        renderCell: ({ value }) => <span className="font-mono tabular-nums">{formatQty(Number(value) || 0)}</span>,
      },
      {
        field: "pmp",
        headerName: "PMP",
        sortable: true,
        width: 100,
        align: "right",
        renderCell: ({ row }) => {
          const r = row as StockGridRow;
          return <span className="tabular-nums text-foreground">{formatMoney(r.pmp)}</span>;
        },
      },
      {
        field: "isBelowMinimum",
        headerName: "Mínimo",
        width: 100,
        sortable: true,
        renderCell: ({ value }) =>
          value ? (
            <Badge variant="warning" className="text-[10px]">
              Bajo
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  const expandableRowContent = useCallback(
    (row: StockGridRow) => (
      <StockExpandPanel
        row={row}
        storages={storages}
        branchId={branchId}
        onAdjust={openAdjust}
        onTransfer={openTransfer}
      />
    ),
    [storages, branchId, openAdjust, openTransfer],
  );

  const submitAdjust = () => {
    if (!adjust) {
      return;
    }
    setError(null);
    const target = Number(String(adjust.targetQty).replace(",", "."));
    if (!Number.isFinite(target) || target < 0) {
      setError("Cantidad objetivo no válida.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await adjustStockAction({
          variantId: adjust.variantId,
          storageId: adjust.storageId,
          currentQuantity: adjust.currentQty,
          targetQuantity: target,
          note: adjust.note.trim() || undefined,
        });
        if (r.success) {
          setAdjust(null);
          await router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const submitTransfer = () => {
    if (!transfer) {
      return;
    }
    const targetStorageId = transfer.targetStorageId;
    if (!targetStorageId) {
      setError("Seleccione almacén destino.");
      return;
    }
    const qty = Number(String(transfer.quantity).replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Cantidad no válida.");
      return;
    }
    setError(null);
    const variantId = transfer.variantId;
    const sourceStorageId = transfer.sourceStorageId;
    const note = transfer.note.trim() || undefined;
    startTransition(() => {
      void (async () => {
        const r = await transferStockAction({
          variantId,
          sourceStorageId,
          targetStorageId,
          quantity: qty,
          note,
        });
        if (r.success) {
          setTransfer(null);
          await router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  return (
    <>
      <DataGrid
        title="Existencias (stock)"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        height="80vh"
        showExportButton={false}
        expandable
        expandableRowContent={(row) => expandableRowContent(row as StockGridRow)}
        headerActions={<StockStorageFilter storages={storages} />}
        data-test-id="stock-data-grid"
      />

      <Dialog
        open={adjust?.open ?? false}
        onClose={() => {
          if (!isPending) {
            setError(null);
            setAdjust(null);
          }
        }}
        title="Ajuste de inventario"
        size="sm"
        scroll="body"
        data-test-id="stock-adjust-dialog"
        alertArea={
          error ? (
            <Alert variant="error" data-test-id="stock-adjust-error">
              {error}
            </Alert>
          ) : null
        }
        actions={
          <>
            <Button variant="outlined" size="md" disabled={isPending} onClick={() => setAdjust(null)}>
              Cancelar
            </Button>
            <Button variant="primary" size="md" disabled={isPending} onClick={submitAdjust}>
              Guardar
            </Button>
          </>
        }
      >
        {adjust ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{adjust.title}</p>
            <p className="text-xs text-muted-foreground">
              Cantidad actual: <span className="font-mono font-medium text-foreground">{formatQty(adjust.currentQty)}</span>
            </p>
            <TextField
              label="Cantidad objetivo"
              name="stock-adjust-target"
              value={adjust.targetQty}
              onChange={(e) => setAdjust({ ...adjust, targetQty: e.target.value })}
              data-test-id="stock-adjust-target"
            />
            <TextField
              label="Nota (opcional)"
              name="stock-adjust-note"
              value={adjust.note}
              onChange={(e) => setAdjust({ ...adjust, note: e.target.value })}
              rows={2}
              data-test-id="stock-adjust-note"
            />
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={transfer?.open ?? false}
        onClose={() => {
          if (!isPending) {
            setError(null);
            setTransfer(null);
          }
        }}
        title="Transferir stock"
        size="sm"
        scroll="body"
        data-test-id="stock-transfer-dialog"
        alertArea={
          error && transfer?.open ? (
            <Alert variant="error" data-test-id="stock-transfer-error">
              {error}
            </Alert>
          ) : null
        }
        actions={
          <>
            <Button variant="outlined" size="md" disabled={isPending} onClick={() => setTransfer(null)}>
              Cancelar
            </Button>
            <Button variant="primary" size="md" disabled={isPending || !transfer?.targetStorageId} onClick={submitTransfer}>
              Transferir
            </Button>
          </>
        }
      >
        {transfer ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Desde: {transfer.sourceLabel}</p>
            <TextField
              label="Cantidad"
              name="stock-transfer-qty"
              type="number"
              min={0.001}
              step={0.001}
              value={transfer.quantity}
              onChange={(e) => setTransfer({ ...transfer, quantity: e.target.value })}
              data-test-id="stock-transfer-qty"
            />
            <Select
              label="Almacén destino"
              name="stock-transfer-target"
              placeholder="Seleccionar"
              options={transferTargetOptions}
              value={transfer.targetStorageId}
              onChange={(id) => setTransfer({ ...transfer, targetStorageId: id == null ? null : String(id) })}
              data-test-id="stock-transfer-target"
            />
            <TextField
              label="Nota (opcional)"
              name="stock-transfer-note"
              value={transfer.note}
              onChange={(e) => setTransfer({ ...transfer, note: e.target.value })}
              rows={2}
              data-test-id="stock-transfer-note"
            />
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
