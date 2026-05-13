import type { StockAlertKind } from './stock-realtime.types';

export function computeStockAlertsFromThresholds(
  physical: number,
  thresholds: { min: number; max: number; reorder: number },
): StockAlertKind[] {
  const alerts: StockAlertKind[] = [];
  const { min, max, reorder } = thresholds;
  if (min > 0 && physical < min) {
    alerts.push('below_minimum');
  }
  if (max > 0 && physical > max) {
    alerts.push('above_maximum');
  }
  if (reorder > 0 && physical <= reorder) {
    alerts.push('reorder');
  }
  return alerts;
}
