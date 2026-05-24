/** Prioridad: bajo mínimo > sobre máximo > reposición (misma regla que el backend). */
export type StockThresholdAlertKind = "below_minimum" | "above_maximum" | "reorder";

export type StorageThresholdEvaluation = {
  physical: number;
  minimum?: number | null;
  minimumEnabled?: boolean;
  maximum?: number | null;
  maximumEnabled?: boolean;
  reorder?: number | null;
  reorderEnabled?: boolean;
};

export function computeStorageThresholdAlert(
  input: StorageThresholdEvaluation,
): StockThresholdAlertKind | null {
  const qty = Number(input.physical);
  if (!Number.isFinite(qty)) {
    return null;
  }
  const min =
    input.minimum != null && Number.isFinite(Number(input.minimum))
      ? Math.max(0, Number(input.minimum))
      : 0;
  const max =
    input.maximum != null && Number.isFinite(Number(input.maximum))
      ? Math.max(0, Number(input.maximum))
      : 0;
  const reorder =
    input.reorder != null && Number.isFinite(Number(input.reorder))
      ? Math.max(0, Number(input.reorder))
      : 0;

  if (input.minimumEnabled && qty < min) {
    return "below_minimum";
  }
  if (input.maximumEnabled && qty > max) {
    return "above_maximum";
  }
  if (input.reorderEnabled && qty <= reorder) {
    return "reorder";
  }
  return null;
}

/** Mismo tono que la card del carrito POS sin stock suficiente. */
export const STOCK_THRESHOLD_ALERT_CARD_CLASS =
  "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/35";

export function labelStorageThresholdAlert(kind: StockThresholdAlertKind): string {
  switch (kind) {
    case "below_minimum":
      return "Stock por debajo del mínimo";
    case "above_maximum":
      return "Stock por encima del máximo";
    case "reorder":
      return "Stock en o bajo el punto de reposición";
    default:
      return "Alerta de stock";
  }
}
