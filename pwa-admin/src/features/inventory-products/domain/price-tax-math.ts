import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";

/** Normaliza montos a entero (CLP / catálogo sin decimales). */
export function roundMoneyInt(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.round(n);
}

/**
 * Factor multiplicador neto → bruto: 1 + suma(tasas IVA % / 100) para los impuestos
 * seleccionados y activos en catálogo. Sin IVA seleccionado → 1.
 */
export function effectiveIvaFactor(
  catalogTaxes: readonly TaxListItem[],
  selectedTaxIds: readonly string[],
): number {
  const idSet = new Set(selectedTaxIds);
  let sumRates = 0;
  for (const t of catalogTaxes) {
    if (!t.isActive || !idSet.has(t.id)) {
      continue;
    }
    if (t.taxType !== "IVA") {
      continue;
    }
    const r = Number(t.rate);
    if (Number.isFinite(r) && r > 0) {
      sumRates += r;
    }
  }
  return 1 + sumRates / 100;
}

export function netToGross(net: number, factor: number): number {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return roundMoneyInt(net * f);
}

export function grossToNet(gross: number, factor: number): number {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return roundMoneyInt(gross / f);
}

/**
 * Interpreta entrada de usuario como entero no negativo (solo dígitos).
 * Vacío → null (campo incompleto).
 */
export function parseIntegerMoneyInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") {
    return null;
  }
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Precio base de catálogo: primer precio neto de filas completas (orden del array).
 * Sin filas válidas → null (usar precio base manual u otro fallback).
 */
/**
 * Precio neto de venta desde PMP (costo ponderado) y utilidad esperada % sobre el costo.
 * `net = round(PMP × (1 + utilidad%/100))`.
 */
export function netFromPmpAndUtilityPercent(pmp: number, utilityPercent: number): number {
  const c = Number.isFinite(pmp) && pmp >= 0 ? pmp : 0;
  const u = Number.isFinite(utilityPercent) ? utilityPercent : 0;
  return roundMoneyInt(c * (1 + u / 100));
}

export function deriveBasePriceFromPriceRows(
  rows: readonly { priceListId: string | null; net: number }[],
): number | null {
  for (const r of rows) {
    if (r.priceListId && Number.isFinite(r.net) && r.net >= 0) {
      return roundMoneyInt(r.net);
    }
  }
  return null;
}
