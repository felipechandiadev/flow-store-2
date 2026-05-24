import type { StockAlertKind } from './stock-realtime.types';

export type StockThresholdEvaluation = {
  min: number;
  max: number;
  reorder: number;
  minEnabled: boolean;
  maxEnabled: boolean;
  reorderEnabled: boolean;
};

/**
 * Una sola alerta por variante+almacén por evaluación (prioridad: bajo mínimo > sobre máximo > reposición).
 */
export function computeStockAlertsFromThresholds(
  physical: number,
  thresholds: StockThresholdEvaluation,
): StockAlertKind[] {
  const { min, max, reorder, minEnabled, maxEnabled, reorderEnabled } =
    thresholds;
  if (minEnabled && physical < min) {
    return ['below_minimum'];
  }
  if (maxEnabled && physical > max) {
    return ['above_maximum'];
  }
  if (reorderEnabled && physical <= reorder) {
    return ['reorder'];
  }
  return [];
}
