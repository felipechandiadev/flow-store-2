import type { StockAlertKind } from './stock-realtime.types';
import { computeStockAlertsFromThresholds } from './stock-alert.util';

export type ThresholdScope = 'storage' | 'variant_total';

export type VariantThresholds = {
  minimumStock?: number;
  maximumStock?: number;
  reorderPoint?: number;
} | null;

export type StockLevelThresholdSlice = {
  storageId: string;
  productVariantId: string;
  physicalStock: unknown;
  availableStock?: unknown;
  minimumStock?: number | null;
  maximumStock?: number | null;
  reorderPoint?: number | null;
};

export type ResolvedStockThresholds = {
  scope: ThresholdScope;
  min: number;
  max: number;
  reorder: number;
  /** Cantidad comparada contra umbrales */
  comparePhysical: number;
  /** Físico en el almacén del movimiento */
  storagePhysical: number;
  /** Total en todos los almacenes (solo scope variant_total) */
  totalPhysical?: number;
  alerts: StockAlertKind[];
};

/** Umbral mínimo explícito en `stock_levels` (> 0). Si no, el mínimo de variante aplica al total. */
export function hasStorageSpecificMinimum(
  stockLevel: { minimumStock?: number | null } | null | undefined,
): boolean {
  if (stockLevel?.minimumStock == null) {
    return false;
  }
  const n = Number(stockLevel.minimumStock);
  return Number.isFinite(n) && n > 0;
}

export function hasStorageSpecificMaximum(
  stockLevel: { maximumStock?: number | null } | null | undefined,
): boolean {
  if (stockLevel?.maximumStock == null) {
    return false;
  }
  const n = Number(stockLevel.maximumStock);
  return Number.isFinite(n) && n > 0;
}

export function hasStorageSpecificReorder(
  stockLevel: { reorderPoint?: number | null } | null | undefined,
): boolean {
  if (stockLevel?.reorderPoint == null) {
    return false;
  }
  const n = Number(stockLevel.reorderPoint);
  return Number.isFinite(n) && n > 0;
}

export function sumVariantPhysicalStock(
  levels: Array<{ storageId: string; physicalStock: unknown }>,
  override?: { storageId: string; physical: number },
): number {
  let sum = 0;
  const seen = new Set<string>();
  for (const sl of levels) {
    const sid = String(sl.storageId || '').trim();
    if (!sid) continue;
    seen.add(sid);
    if (override && sid === override.storageId) {
      sum += Math.max(0, Number(override.physical) || 0);
    } else {
      sum += Math.max(0, Number(sl.physicalStock ?? 0) || 0);
    }
  }
  if (override && !seen.has(override.storageId)) {
    sum += Math.max(0, Number(override.physical) || 0);
  }
  return sum;
}

export function resolveStockThresholds(
  variantRow: VariantThresholds,
  stockEntry: StockLevelThresholdSlice,
  options?: { totalPhysicalStock?: number },
): ResolvedStockThresholds {
  const storagePhysical = Math.max(0, Number(stockEntry.physicalStock ?? 0) || 0);
  const totalPhysical = Math.max(
    0,
    options?.totalPhysicalStock ?? storagePhysical,
  );
  const storageScope = hasStorageSpecificMinimum(stockEntry);

  const min = storageScope
    ? Number(stockEntry.minimumStock)
    : Number(variantRow?.minimumStock ?? 0);
  const max = hasStorageSpecificMaximum(stockEntry)
    ? Number(stockEntry.maximumStock)
    : Number(variantRow?.maximumStock ?? 0);
  const reorder = hasStorageSpecificReorder(stockEntry)
    ? Number(stockEntry.reorderPoint)
    : Number(variantRow?.reorderPoint ?? 0);

  const comparePhysical = storageScope ? storagePhysical : totalPhysical;
  const alerts = computeStockAlertsFromThresholds(comparePhysical, {
    min,
    max,
    reorder,
  });

  return {
    scope: storageScope ? 'storage' : 'variant_total',
    min,
    max,
    reorder,
    comparePhysical,
    storagePhysical,
    totalPhysical: storageScope ? undefined : totalPhysical,
    alerts,
  };
}

export function stockAlertGroupKey(
  companyId: string,
  variantId: string,
  storageId: string,
  kind: string,
  scope: ThresholdScope,
): string {
  if (scope === 'variant_total') {
    return `stock:${companyId}:variant:${variantId}:${kind}`;
  }
  return `stock:${companyId}:${storageId}:${variantId}:${kind}`;
}
