import type { StockAlertKind } from './stock-realtime.types';

/**
 * Una sola alerta por variante+almacén por evaluación (prioridad: bajo mínimo > sobre máximo > reposición).
 * Evita dos notificaciones cuando el stock está bajo el mínimo y también bajo el punto de reposición.
 */
export function computeStockAlertsFromThresholds(
  physical: number,
  thresholds: { min: number; max: number; reorder: number },
): StockAlertKind[] {
  const { min, max, reorder } = thresholds;
  if (min > 0 && physical < min) {
    return ['below_minimum'];
  }
  if (max > 0 && physical > max) {
    return ['above_maximum'];
  }
  if (reorder > 0 && physical <= reorder) {
    return ['reorder'];
  }
  return [];
}
