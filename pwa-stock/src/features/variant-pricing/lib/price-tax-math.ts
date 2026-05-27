import type { TaxListItem } from "../types/tax.types";

export function roundMoneyInt(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.round(n);
}

export function effectiveIvaFactor(
  catalogTaxes: readonly TaxListItem[],
  selectedTaxIds: readonly string[],
): number {
  const idSet = new Set(selectedTaxIds);
  let sumRates = 0;
  for (const t of catalogTaxes) {
    if (!t.isActive || !idSet.has(t.id) || t.taxType !== "IVA") {
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
