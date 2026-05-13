import { computeStockAlertsFromThresholds } from './stock-alert.util';
import type { StockUpdatedPayload } from './stock-realtime.types';

type VariantThresholds = {
  minimumStock?: number;
  maximumStock?: number;
  reorderPoint?: number;
} | null;

type StockLevelThresholdSlice = {
  storageId: string;
  productVariantId: string;
  physicalStock: unknown;
  availableStock: unknown;
  minimumStock?: number | null;
  maximumStock?: number | null;
  reorderPoint?: number | null;
};

/**
 * Misma lógica que el ajuste de stock vía automatización: umbrales efectivos
 * (override en `stock_levels` o valores en variante).
 */
export function buildStockUpdatedPayload(
  companyId: string,
  variantRow: VariantThresholds,
  stockEntry: StockLevelThresholdSlice,
  transactionId: string | null | undefined,
): StockUpdatedPayload {
  const physical = Number(stockEntry.physicalStock ?? 0);
  const available = Number(stockEntry.availableStock ?? 0);
  const effMin =
    stockEntry.minimumStock != null
      ? Number(stockEntry.minimumStock)
      : Number(variantRow?.minimumStock ?? 0);
  const effMax =
    stockEntry.maximumStock != null
      ? Number(stockEntry.maximumStock)
      : Number(variantRow?.maximumStock ?? 0);
  const effReorder =
    stockEntry.reorderPoint != null
      ? Number(stockEntry.reorderPoint)
      : Number(variantRow?.reorderPoint ?? 0);
  const alerts = computeStockAlertsFromThresholds(physical, {
    min: effMin,
    max: effMax,
    reorder: effReorder,
  });
  return {
    companyId,
    storageId: stockEntry.storageId,
    productVariantId: stockEntry.productVariantId,
    physicalStock: physical,
    availableStock: available,
    transactionId: transactionId ?? null,
    alerts,
  };
}
