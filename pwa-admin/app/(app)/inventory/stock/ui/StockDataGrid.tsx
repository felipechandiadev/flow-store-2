"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import IconButton from "@/shared/components/IconButton/IconButton";
import { adjustStockAction, transferStockAction } from "@/features/inventory-stock/actions/stock.action";
import { useNotificationsRealtime } from "@/features/notifications/realtime/notifications-realtime-context";
import { EditVariantStockConfigDialog } from "./EditVariantStockConfigDialog";
import { StockMovementsDialog } from "./StockMovementsDialog";
import Switch from "@/shared/components/Switch/Switch";
import {
  readStockGridCountUnit,
  writeStockGridCountUnit,
} from "@/features/inventory-stock/lib/stock-grid-count-unit-storage";
import {
  computeStorageThresholdAlert,
  labelStorageThresholdAlert,
  STOCK_THRESHOLD_ALERT_CARD_CLASS,
  STOCK_THRESHOLD_ALERT_ROW_CLASS,
  stockRowHasThresholdAlert,
} from "@/features/inventory-stock/lib/stock-threshold-alert";

type StockDataGridProps = {
  rows: StockGridRow[];
  total: number;
  storages: StorageListItem[];
  /** When set, expand cards only list storages belonging to this branch. */
  branchId?: string;
  /** Almacén del filtro de la página; preselección en el diálogo de movimientos. */
  filterStorageId?: string;
};

function formatQty(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(n);
}

function findStorageQuantity(
  rows: StockGridRow[],
  variantId: string,
  storageId: string,
): number | undefined {
  const row = rows.find((r) => r.variantId === variantId);
  const breakdown = row?.storageBreakdown?.find((b) => b.storageId === storageId);
  if (!breakdown) {
    return undefined;
  }
  const q = Number(breakdown.quantity);
  return Number.isFinite(q) ? Math.max(0, q) : undefined;
}

function stockQtyPerSaleUnit(row: StockGridRow | undefined): number | null {
  if (!row) {
    return null;
  }
  const f = row.stockBaseQtyPerSaleUnit ?? row.stockBaseQtyPerCountSaleUnit;
  return f != null && f > 0 && Number.isFinite(f) ? f : null;
}

function usesSaleUnitCount(row: StockGridRow | undefined): boolean {
  const bridge = stockQtyPerSaleUnit(row);
  return bridge != null && Boolean((row?.saleUnitSymbol || row?.saleUnitOfMeasure || "").trim());
}

function unitLabelSymbol(row: StockGridRow, kind: "stock" | "sale"): string {
  const sym =
    kind === "stock"
      ? (row.stockUnitSymbol || "").trim()
      : (row.saleUnitSymbol || "").trim();
  if (sym) {
    return sym;
  }
  const label = kind === "stock" ? row.unitOfMeasure : row.saleUnitOfMeasure;
  const t = (label || "").trim();
  const paren = t.match(/\(([^)]+)\)\s*$/);
  if (paren?.[1]?.trim()) {
    return paren[1].trim();
  }
  return t;
}

function physicalToCountQty(physicalQty: number, row: StockGridRow | undefined): number {
  const bridge = stockQtyPerSaleUnit(row);
  if (bridge == null) {
    return physicalQty;
  }
  return physicalQty / bridge;
}

function countQtyToPhysical(countQty: number, row: StockGridRow | undefined): number {
  const bridge = stockQtyPerSaleUnit(row);
  if (bridge == null) {
    return countQty;
  }
  return countQty * bridge;
}

function roundCountQty(n: number): number {
  return Math.max(0, Math.round(n * 1000) / 1000);
}

function effectiveCountInSaleUnits(
  row: StockGridRow | undefined,
  preferSaleUnits: boolean,
): boolean {
  return preferSaleUnits && usesSaleUnitCount(row);
}

function applyPhysicalDelta(
  currentPhysical: number,
  delta: number,
  row: StockGridRow | undefined,
  inSaleUnits: boolean,
): number {
  const physicalDelta =
    inSaleUnits && usesSaleUnitCount(row) ? countQtyToPhysical(delta, row) : delta;
  return Math.max(0, roundCountQty(currentPhysical + physicalDelta));
}

function stockUnitDiffersFromSale(row: StockGridRow): boolean {
  if (row.stockBaseUnitId && row.saleUnitId) {
    return row.stockBaseUnitId !== row.saleUnitId;
  }
  const stockSym = unitLabelSymbol(row, "stock").toLowerCase();
  const saleSym = unitLabelSymbol(row, "sale").toLowerCase();
  if (stockSym && saleSym) {
    return stockSym !== saleSym;
  }
  const stockName = (row.unitOfMeasure || "").trim().toLowerCase();
  const saleName = (row.saleUnitOfMeasure || "").trim().toLowerCase();
  if (stockName && saleName) {
    return stockName !== saleName;
  }
  return stockQtyPerSaleUnit(row) != null;
}

/** Cantidad en unidad base de stock / equivalente en unidad de venta. Ej. 20.000ml/20un */
function formatStockSlashPair(qty: number, row: StockGridRow): string {
  const n = Number(qty);
  if (!Number.isFinite(n)) {
    return formatQty(0);
  }
  const stockSym = unitLabelSymbol(row, "stock");
  const saleSym = unitLabelSymbol(row, "sale");
  const perSale = stockQtyPerSaleUnit(row);
  if (perSale != null && stockUnitDiffersFromSale(row) && stockSym && saleSym) {
    const saleQty = n / perSale;
    if (Number.isFinite(saleQty) && saleQty >= 0) {
      return `${formatQty(n)}${stockSym}/${formatQty(saleQty)}${saleSym}`;
    }
  }
  return stockSym ? `${formatQty(n)}${stockSym}` : formatQty(n);
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

function formatThreshold(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) {
    return "—";
  }
  return formatQty(Math.max(0, Number(n)));
}

function StockThresholdBadge({
  abbr,
  label,
  value,
  enabled,
  "data-test-id": dataTestId,
}: {
  abbr: string;
  label: string;
  value: number | null | undefined;
  enabled?: boolean;
  "data-test-id"?: string;
}) {
  const display = enabled === true ? formatThreshold(value) : "—";
  const title =
    enabled === true ? `${label}: ${display}` : `${label}: deshabilitado`;
  return (
    <span data-test-id={dataTestId} title={title}>
      <Badge
        variant="secondary-outlined"
        className="!inline-flex !items-center !gap-1.5 !px-1.5 !py-0 text-[10px] font-medium leading-5 tabular-nums"
      >
        <span className="text-muted-foreground">{abbr}</span>
        <span className="font-mono text-foreground">{display}</span>
      </Badge>
    </span>
  );
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
      reservedStock: 0,
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

function parseStockAlertsParam(value: string | null): boolean {
  const s = (value ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function StockAlertsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = parseStockAlertsParam(searchParams.get("stock-alerts"));

  const setActive = (on: boolean) => {
    const next = new URLSearchParams(searchParams.toString());
    if (on) {
      next.set("stock-alerts", "true");
    } else {
      next.delete("stock-alerts");
    }
    next.set("page", "1");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?page=1", { scroll: false });
  };

  return (
    <div
      className="flex shrink-0 items-center"
      data-test-id="stock-grid-stock-alerts-filter"
    >
      <Switch
        checked={active}
        onChange={setActive}
        label="Alertas de stock"
        labelPosition="left"
        density="compact"
        data-test-id="stock-alerts-filter-switch"
      />
    </div>
  );
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
        density="compact"
        labelLayout="inline"
        alwaysShowLabel
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
  /** Stock físico en unidad base (como en BD). */
  physicalCurrentQty: number;
  targetQty: string;
  note: string;
  countInSaleUnits: boolean;
  stockUnitSymbol: string;
  saleUnitSymbol: string;
};

type TransferState = {
  open: boolean;
  variantId: string;
  sourceStorageId: string;
  sourceLabel: string;
  quantity: string;
  targetStorageId: string | null;
  note: string;
  countInSaleUnits: boolean;
  stockUnitSymbol: string;
  saleUnitSymbol: string;
};

function StockStorageCard({
  row,
  b,
  busy,
  countInSaleUnits,
  onCountInSaleUnitsChange,
  onRecount,
  onQuickDelta,
  onTransfer,
  canTransfer,
}: {
  row: StockGridRow;
  b: StockStorageBreakdownRow;
  busy: boolean;
  countInSaleUnits: boolean;
  onCountInSaleUnitsChange: (saleUnits: boolean) => void;
  onRecount: (p: { variantId: string; storageId: string; title: string; currentQty: number }) => void;
  onQuickDelta: (p: { variantId: string; storageId: string; currentQty: number; delta: number }) => void;
  onTransfer: (p: { variantId: string; sourceStorageId: string; sourceLabel: string }) => void;
  canTransfer: boolean;
}) {
  const title = [b.storageName, b.branchName].filter(Boolean).join(" · ");
  const stockSym = unitLabelSymbol(row, "stock");
  const saleSym = unitLabelSymbol(row, "sale");
  const showUnitSwitch = usesSaleUnitCount(row) && stockUnitDiffersFromSale(row);
  const min = b.effectiveMinimumStock;
  const max = b.effectiveMaximumStock;
  const reorder = b.effectiveReorderPoint;
  const thresholdAlert = computeStorageThresholdAlert({
    physical: b.quantity,
    minimum: b.effectiveMinimumStock ?? min,
    minimumEnabled: b.effectiveMinimumStockEnabled,
    maximum: b.effectiveMaximumStock ?? max,
    maximumEnabled: b.effectiveMaximumStockEnabled,
    reorder: b.effectiveReorderPoint ?? reorder,
    reorderEnabled: b.effectiveReorderPointEnabled,
  });
  return (
    <article
      className={`flex min-w-0 flex-col gap-2 rounded-xl border p-3 shadow-sm ${
        thresholdAlert ? STOCK_THRESHOLD_ALERT_CARD_CLASS : "border-border bg-background"
      }`}
      data-test-id={`stock-storage-card-${row.variantId}-${b.storageId}`}
      data-threshold-alert={thresholdAlert ?? undefined}
      title={thresholdAlert ? labelStorageThresholdAlert(thresholdAlert) : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-foreground" title={title}>
            {b.storageName}
          </h4>
          {b.branchName ? <p className="text-xs text-muted-foreground">{b.branchName}</p> : null}
        </div>
        <div
          className="flex max-w-[58%] shrink-0 flex-wrap items-center justify-end gap-1"
          data-test-id={`stock-thresholds-${b.storageId}`}
        >
          <StockThresholdBadge
            abbr="Mín"
            label="Mínimo"
            value={min}
            enabled={b.effectiveMinimumStockEnabled}
            data-test-id={`stock-threshold-min-${b.storageId}`}
          />
          <StockThresholdBadge
            abbr="Máx"
            label="Máximo"
            value={max}
            enabled={b.effectiveMaximumStockEnabled}
            data-test-id={`stock-threshold-max-${b.storageId}`}
          />
          <StockThresholdBadge
            abbr="Rep"
            label="Punto de reposición"
            value={reorder}
            enabled={b.effectiveReorderPointEnabled}
            data-test-id={`stock-threshold-rep-${b.storageId}`}
          />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Físico</dt>
        <dd
          className="text-right font-mono tabular-nums text-foreground"
          title={
            stockUnitDiffersFromSale(row)
              ? `${unitLabelSymbol(row, "stock")} (base) / ${unitLabelSymbol(row, "sale")} (venta)`
              : row.unitOfMeasure || undefined
          }
        >
          {formatStockSlashPair(b.quantity, row)}
        </dd>
        <dt className="text-muted-foreground">Reservado</dt>
        <dd className="text-right font-mono tabular-nums text-foreground">
          {formatStockSlashPair(b.reservedStock, row)}
        </dd>
        <dt className="text-muted-foreground">Disponible</dt>
        <dd
          className={`text-right font-mono tabular-nums ${
            b.availableStock < 0 ? "text-destructive" : "text-foreground"
          }`}
          title={
            stockUnitDiffersFromSale(row)
              ? `${unitLabelSymbol(row, "stock")} (base) / ${unitLabelSymbol(row, "sale")} (venta)`
              : row.unitOfMeasure || undefined
          }
        >
          {formatStockSlashPair(b.availableStock, row)}
        </dd>
      </dl>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        {showUnitSwitch ? (
          <Switch
            density="compact"
            checked={countInSaleUnits}
            onChange={onCountInSaleUnitsChange}
            disabled={busy}
            optionLabels={{
              off: stockSym || "Stock",
              on: saleSym || "Venta",
            }}
            data-test-id={`stock-unit-switch-${b.storageId}`}
          />
        ) : (
          <span className="min-w-0 flex-1" aria-hidden />
        )}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
        <IconButton
          icon="RefreshCcw"
          variant="basicSecondary"
          size="sm"
          ariaLabel="Reconteo"
          disabled={busy}
          onClick={() =>
            onRecount({
              variantId: row.variantId,
              storageId: b.storageId,
              title,
              currentQty: b.quantity,
            })
          }
          data-test-id={`stock-recount-${b.storageId}`}
        />
        <IconButton
          icon="Minus"
          variant="basicSecondary"
          size="sm"
          ariaLabel="Disminuir stock"
          disabled={busy || b.quantity <= 0}
          onClick={() =>
            onQuickDelta({
              variantId: row.variantId,
              storageId: b.storageId,
              currentQty: b.quantity,
              delta: -1,
            })
          }
          data-test-id={`stock-decrease-${b.storageId}`}
        />
        <IconButton
          icon="Plus"
          variant="basicSecondary"
          size="sm"
          ariaLabel="Aumentar stock"
          disabled={busy}
          onClick={() =>
            onQuickDelta({
              variantId: row.variantId,
              storageId: b.storageId,
              currentQty: b.quantity,
              delta: 1,
            })
          }
          data-test-id={`stock-increase-${b.storageId}`}
        />
        <IconButton
          icon="ArrowLeftRight"
          variant="basicSecondary"
          size="sm"
          ariaLabel="Transferir stock"
          disabled={busy || !canTransfer}
          onClick={() =>
            onTransfer({
              variantId: row.variantId,
              sourceStorageId: b.storageId,
              sourceLabel: title,
            })
          }
          data-test-id={`stock-transfer-open-${b.storageId}`}
        />
        </div>
      </div>
    </article>
  );
}

function StockExpandPanel({
  row,
  storages,
  branchId,
  busy,
  canTransfer,
  countInSaleUnits,
  onCountInSaleUnitsChange,
  onRecount,
  onQuickDelta,
  onTransfer,
}: {
  row: StockGridRow;
  storages: StorageListItem[];
  branchId?: string;
  busy: boolean;
  canTransfer: boolean;
  countInSaleUnits: boolean;
  onCountInSaleUnitsChange: (saleUnits: boolean) => void;
  onRecount: (p: { variantId: string; storageId: string; title: string; currentQty: number }) => void;
  onQuickDelta: (p: { variantId: string; storageId: string; currentQty: number; delta: number }) => void;
  onTransfer: (p: { variantId: string; sourceStorageId: string; sourceLabel: string }) => void;
}) {
  const cards = useMemo(
    () => mergeStoragesWithBreakdown(storages, row.storageBreakdown ?? [], branchId),
    [storages, row.storageBreakdown, branchId],
  );

  const stockSym = unitLabelSymbol(row, "stock");
  const saleSym = unitLabelSymbol(row, "sale");
  const dualUnits = stockUnitDiffersFromSale(row) && stockSym && saleSym;

  return (
    <div className="w-full min-w-0 max-w-none py-1" data-test-id={`stock-expand-${row.variantId}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Stock por almacén
        </p>
        {dualUnits ? (
          <p className="text-xs text-muted-foreground" data-test-id={`stock-expand-uom-${row.variantId}`}>
            Cantidades en{" "}
            <span className="font-mono font-medium text-foreground">{stockSym}</span>
            {" / "}
            <span className="font-mono font-medium text-foreground">{saleSym}</span>
          </p>
        ) : null}
      </div>
      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay almacenes configurados.</p>
      ) : (
        <div className="grid max-h-[min(24rem,55vh)] w-full grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((b) => (
            <StockStorageCard
              key={b.storageId}
              row={row}
              b={b}
              busy={busy}
              countInSaleUnits={countInSaleUnits}
              onCountInSaleUnitsChange={onCountInSaleUnitsChange}
              canTransfer={canTransfer}
              onRecount={onRecount}
              onQuickDelta={onQuickDelta}
              onTransfer={onTransfer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StockDataGrid({
  rows,
  total,
  storages,
  branchId,
  filterStorageId,
}: StockDataGridProps) {
  const router = useRouter();
  const { stockRefreshToken } = useNotificationsRealtime();
  const lastRealtimeRefreshAt = useRef(0);

  useEffect(() => {
    if (!stockRefreshToken || stockRefreshToken === lastRealtimeRefreshAt.current) {
      return;
    }
    lastRealtimeRefreshAt.current = stockRefreshToken;
    const t = window.setTimeout(() => {
      router.refresh();
    }, 400);
    return () => window.clearTimeout(t);
  }, [stockRefreshToken, router]);

  const [adjust, setAdjust] = useState<AdjustState | null>(null);
  const [transfer, setTransfer] = useState<TransferState | null>(null);
  const [configRow, setConfigRow] = useState<StockGridRow | null>(null);
  const [movementsRow, setMovementsRow] = useState<StockGridRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** No usar `startTransition` para el action + refresh: retrasa el RSC y la grilla puede quedar con datos viejos. */
  const [isSaving, setIsSaving] = useState(false);
  const [countInSaleUnits, setCountInSaleUnits] = useState(
    () => (typeof window !== "undefined" ? readStockGridCountUnit() === "sale" : true),
  );

  const handleCountUnitChange = useCallback((saleUnits: boolean) => {
    setCountInSaleUnits(saleUnits);
    writeStockGridCountUnit(saleUnits ? "sale" : "stock");
  }, []);

  const canTransferStock = useMemo(
    () => storages.filter((s) => s.isActive !== false).length > 1,
    [storages],
  );

  const openRecount = useCallback(
    (p: { variantId: string; storageId: string; title: string; currentQty: number }) => {
      const row = rows.find((r) => r.variantId === p.variantId);
      const fromGrid = findStorageQuantity(rows, p.variantId, p.storageId);
      const physicalCurrentQty =
        fromGrid !== undefined ? fromGrid : Math.max(0, Number(p.currentQty) || 0);
      const countInSale = effectiveCountInSaleUnits(row, countInSaleUnits);
      const displayQty = countInSale
        ? roundCountQty(physicalToCountQty(physicalCurrentQty, row))
        : roundCountQty(physicalCurrentQty);
      setError(null);
      setAdjust({
        open: true,
        variantId: p.variantId,
        storageId: p.storageId,
        title: p.title,
        physicalCurrentQty,
        targetQty: String(displayQty),
        note: "",
        countInSaleUnits: countInSale,
        stockUnitSymbol: row?.stockUnitSymbol?.trim() || row?.unitOfMeasure?.trim() || "",
        saleUnitSymbol: row?.saleUnitSymbol?.trim() || "",
      });
    },
    [rows, countInSaleUnits],
  );

  const submitQuickDelta = useCallback(
    (p: { variantId: string; storageId: string; currentQty: number; delta: number }) => {
      const row = rows.find((r) => r.variantId === p.variantId);
      const fromGrid = findStorageQuantity(rows, p.variantId, p.storageId);
      const currentQty =
        fromGrid !== undefined ? fromGrid : Math.max(0, Number(p.currentQty) || 0);
      const inSale = effectiveCountInSaleUnits(row, countInSaleUnits);
      const target = applyPhysicalDelta(currentQty, p.delta, row, inSale);
      setError(null);
      void (async () => {
        setIsSaving(true);
        try {
          const r = await adjustStockAction({
            variantId: p.variantId,
            storageId: p.storageId,
            currentQuantity: currentQty,
            targetQuantity: target,
          });
          if (r.success) {
            await router.refresh();
          } else {
            setError(r.error);
          }
        } finally {
          setIsSaving(false);
        }
      })();
    },
    [router, rows, countInSaleUnits],
  );

  useEffect(() => {
    if (!adjust?.open) {
      return;
    }
    const row = rows.find((r) => r.variantId === adjust.variantId);
    const fromGrid = findStorageQuantity(rows, adjust.variantId, adjust.storageId);
    if (fromGrid === undefined || fromGrid === adjust.physicalCurrentQty) {
      return;
    }
    const inSale = effectiveCountInSaleUnits(row, countInSaleUnits);
    const displayQty = inSale
      ? roundCountQty(physicalToCountQty(fromGrid, row))
      : roundCountQty(fromGrid);
    setAdjust((prev) =>
      prev
        ? {
            ...prev,
            physicalCurrentQty: fromGrid,
            targetQty: String(displayQty),
            countInSaleUnits: inSale,
          }
        : null,
    );
  }, [rows, adjust?.open, adjust?.variantId, adjust?.storageId, adjust?.physicalCurrentQty, countInSaleUnits]);

  const openTransfer = useCallback(
    (p: { variantId: string; sourceStorageId: string; sourceLabel: string }) => {
      setError(null);
      const row = rows.find((r) => r.variantId === p.variantId);
      const inSale = effectiveCountInSaleUnits(row, countInSaleUnits);
      const others = storages.filter((s) => s.id !== p.sourceStorageId && s.isActive !== false);
      setTransfer({
        open: true,
        variantId: p.variantId,
        sourceStorageId: p.sourceStorageId,
        sourceLabel: p.sourceLabel,
        quantity: "1",
        targetStorageId: others[0]?.id ?? null,
        note: "",
        countInSaleUnits: inSale,
        stockUnitSymbol: row?.stockUnitSymbol?.trim() || row?.unitOfMeasure?.trim() || "",
        saleUnitSymbol: row?.saleUnitSymbol?.trim() || "",
      });
    },
    [storages, rows, countInSaleUnits],
  );

  const transferTargetOptions: Option[] = useMemo(() => {
    if (!transfer) {
      return [];
    }
    return storages
      .filter((s) => s.id !== transfer.sourceStorageId && s.isActive !== false)
      .map((s) => ({ id: s.id, label: s.name }));
  }, [storages, transfer]);

  const columns: DataGridColumn[] = useMemo(
    () => {
      function StockRowActionsCell({ row: gridRow }: { row: Record<string, unknown> }) {
        const r = gridRow as StockGridRow;
        return (
          <div
            className="flex items-center justify-center gap-0.5"
            data-test-id={`stock-row-actions-${r.variantId}`}
          >
            <IconButton
              icon="MoreHorizontal"
              variant="basicSecondary"
              size="sm"
              ariaLabel="Ver movimientos de stock"
              onClick={() => setMovementsRow(r)}
              data-test-id={`stock-row-movements-${r.variantId}`}
            />
            <IconButton
              icon="Pencil"
              variant="basicSecondary"
              size="sm"
              ariaLabel="Editar configuración de stock"
              onClick={() => setConfigRow(r)}
              data-test-id={`stock-row-config-${r.variantId}`}
            />
          </div>
        );
      }

      return [
      {
        field: "productName",
        headerName: "Producto",
        sortable: true,
        minWidth: 140,
        flex: 1.5,
        cellOverflow: "wrap",
        renderCell: ({ row }) => {
          const r = row as StockGridRow;
          const attrs = formatAttrs(r.attributeValues);
          return (
            <div className="min-w-0 w-full space-y-0.5">
              <p className="font-medium text-foreground">{r.productName}</p>
              {attrs ? <p className="text-xs text-muted-foreground">{attrs}</p> : null}
            </div>
          );
        },
      },
      { field: "sku", headerName: "SKU", sortable: true, width: 160 },
      {
        field: "barcode",
        headerName: "Cód. barras",
        sortable: true,
        width: 150,
        renderCell: ({ row }) => {
          const r = row as StockGridRow;
          const code = r.barcode?.trim();
          return code ? (
            <span className="font-mono text-sm text-foreground" title={code}>
              {code}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        field: "unitOfMeasure",
        headerName: "Unidad stock",
        sortable: true,
        width: 120,
        renderCell: ({ row }) => {
          const r = row as StockGridRow;
          const t = r.unitOfMeasure?.trim();
          return t ? (
            <span className="text-foreground" title={t}>
              {t}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        field: "saleUnitOfMeasure",
        headerName: "Unidad venta",
        sortable: true,
        width: 120,
        renderCell: ({ row }) => {
          const r = row as StockGridRow;
          const t = r.saleUnitOfMeasure?.trim();
          return t ? (
            <span className="text-foreground" title={t}>
              {t}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        field: "totalStock",
        headerName: "Stock total",
        sortable: true,
        width: 130,
        align: "right",
        renderCell: ({ row, value }) => (
          <span className="font-mono tabular-nums" title={(row as StockGridRow).unitOfMeasure || undefined}>
            {formatStockSlashPair(Number(value) || 0, row as StockGridRow)}
          </span>
        ),
      },
      {
        field: "availableStock",
        headerName: "Disponible",
        sortable: true,
        width: 130,
        align: "right",
        renderCell: ({ row, value }) => (
          <span className="font-mono tabular-nums" title={(row as StockGridRow).unitOfMeasure || undefined}>
            {formatStockSlashPair(Number(value) || 0, row as StockGridRow)}
          </span>
        ),
      },
      {
        field: "pmpValue",
        headerName: "Valor stock (PMP)",
        sortable: true,
        width: 130,
        align: "right",
        renderCell: ({ row }) => {
          const r = row as StockGridRow;
          if (r.pmpValue == null || !Number.isFinite(r.pmpValue)) {
            return <span className="text-muted-foreground">Sin PMP</span>;
          }
          return <span className="tabular-nums text-foreground">{formatMoney(r.pmpValue)}</span>;
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 88,
        minWidth: 88,
        maxWidth: 88,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: StockRowActionsCell,
      },
    ];
    },
    [],
  );

  const expandableRowContent = useCallback(
    (row: StockGridRow) => (
      <StockExpandPanel
        row={row}
        storages={storages}
        branchId={branchId}
        busy={isSaving}
        canTransfer={canTransferStock}
        countInSaleUnits={countInSaleUnits}
        onCountInSaleUnitsChange={handleCountUnitChange}
        onRecount={openRecount}
        onQuickDelta={submitQuickDelta}
        onTransfer={openTransfer}
      />
    ),
    [
      storages,
      branchId,
      isSaving,
      canTransferStock,
      countInSaleUnits,
      handleCountUnitChange,
      openRecount,
      submitQuickDelta,
      openTransfer,
    ],
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
    const row = rows.find((r) => r.variantId === adjust.variantId);
    const fromGrid = findStorageQuantity(rows, adjust.variantId, adjust.storageId);
    const currentPhysical =
      fromGrid !== undefined ? fromGrid : Math.max(0, Number(adjust.physicalCurrentQty) || 0);
    const targetPhysical = roundCountQty(
      adjust.countInSaleUnits ? countQtyToPhysical(target, row) : target,
    );
    void (async () => {
      setIsSaving(true);
      try {
        const r = await adjustStockAction({
          variantId: adjust.variantId,
          storageId: adjust.storageId,
          currentQuantity: currentPhysical,
          targetQuantity: targetPhysical,
          note: adjust.note.trim() || undefined,
        });
        if (r.success) {
          setAdjust(null);
          await router.refresh();
        } else {
          setError(r.error);
        }
      } finally {
        setIsSaving(false);
      }
    })();
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
    const row = rows.find((r) => r.variantId === variantId);
    const physicalQty = transfer.countInSaleUnits
      ? roundCountQty(countQtyToPhysical(qty, row))
      : roundCountQty(qty);
    if (physicalQty <= 0) {
      setError("Cantidad no válida.");
      return;
    }
    void (async () => {
      setIsSaving(true);
      try {
        const r = await transferStockAction({
          variantId,
          sourceStorageId,
          targetStorageId,
          quantity: physicalQty,
          note,
        });
        if (r.success) {
          setTransfer(null);
          await router.refresh();
        } else {
          setError(r.error);
        }
      } finally {
        setIsSaving(false);
      }
    })();
  };

  return (
    <>
      {error && !adjust?.open && !transfer?.open ? (
        <Alert variant="error" className="mb-3" data-test-id="stock-grid-inline-error">
          {error}
        </Alert>
      ) : null}
      <DataGrid
        title="Existencias (stock)"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        fillViewport
        showExportButton={false}
        expandable
        expandableRowContent={(row) => expandableRowContent(row as StockGridRow)}
        headerActions={
          <div className="flex flex-wrap items-center justify-center gap-4">
            <StockStorageFilter storages={storages} />
            <StockAlertsFilter />
          </div>
        }
        pinActionsColumn
        actionsColumnField="actions"
        getRowAppearance={({ row }) => {
          const r = row as StockGridRow;
          if (!stockRowHasThresholdAlert(r)) {
            return null;
          }
          return {
            className: STOCK_THRESHOLD_ALERT_ROW_CLASS,
            variant: "stock-alert",
          };
        }}
        data-test-id="stock-data-grid"
      />

      <EditVariantStockConfigDialog
        open={configRow != null}
        row={configRow}
        storages={storages}
        branchId={branchId}
        onClose={() => setConfigRow(null)}
        onSaved={() => router.refresh()}
      />

      <StockMovementsDialog
        open={movementsRow != null}
        row={movementsRow}
        storages={storages}
        branchId={branchId}
        filterStorageId={filterStorageId}
        onClose={() => setMovementsRow(null)}
      />

      <Dialog
        open={adjust?.open ?? false}
        onClose={() => {
          if (!isSaving) {
            setError(null);
            setAdjust(null);
          }
        }}
        title="Reconteo"
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
            <Button variant="outlined" size="md" disabled={isSaving} onClick={() => setAdjust(null)}>
              Cancelar
            </Button>
            <Button variant="primary" size="md" disabled={isSaving} onClick={submitAdjust}>
              Guardar
            </Button>
          </>
        }
      >
        {adjust ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{adjust.title}</p>
            <p className="text-xs text-muted-foreground">
              Stock físico actual:{" "}
              <span className="font-mono font-medium text-foreground">
                {formatQty(
                  adjust.countInSaleUnits
                    ? roundCountQty(
                        physicalToCountQty(
                          adjust.physicalCurrentQty,
                          rows.find((r) => r.variantId === adjust.variantId),
                        ),
                      )
                    : adjust.physicalCurrentQty,
                )}
                {adjust.countInSaleUnits && adjust.saleUnitSymbol
                  ? adjust.saleUnitSymbol
                  : adjust.stockUnitSymbol || ""}
              </span>
            </p>
            <TextField
              label={
                adjust.countInSaleUnits && adjust.saleUnitSymbol
                  ? `Nuevo stock físico total (${adjust.saleUnitSymbol})`
                  : `Nuevo stock físico total${adjust.stockUnitSymbol ? ` (${adjust.stockUnitSymbol})` : ""}`
              }
              name="stock-adjust-target"
              selectOnFocus
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
          if (!isSaving) {
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
            <Button variant="outlined" size="md" disabled={isSaving} onClick={() => setTransfer(null)}>
              Cancelar
            </Button>
            <Button variant="primary" size="md" disabled={isSaving || !transfer?.targetStorageId} onClick={submitTransfer}>
              Transferir
            </Button>
          </>
        }
      >
        {transfer ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Desde: {transfer.sourceLabel}</p>
            <TextField
              label={
                transfer.countInSaleUnits && transfer.saleUnitSymbol
                  ? `Cantidad (${transfer.saleUnitSymbol})`
                  : `Cantidad${transfer.stockUnitSymbol ? ` (${transfer.stockUnitSymbol})` : ""}`
              }
              name="stock-transfer-qty"
              type="number"
              min={0.001}
              step={0.001}
              value={transfer.quantity}
              onChange={(e) => setTransfer({ ...transfer, quantity: e.target.value })}
              selectOnFocus
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
