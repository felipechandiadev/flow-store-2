export type JewelryPriceInput = {
  weightGrams: number;
  metalPricePerGram: number;
  mermaPercent: number;
  utilityPercent: number;
  stonesCost: number;
  laborCost: number;
  otherCosts: number;
};

function parseMoneyInput(raw: string): number {
  const normalized = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function parseJewelryPercent(raw: string): number {
  const n = Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(100, Math.max(0, n));
}

export function computeJewelryNetPrice(input: JewelryPriceInput): number {
  const w = Math.max(0, input.weightGrams);
  const precioMetal = Math.max(0, input.metalPricePerGram);
  const mermaPct = parseJewelryPercent(String(input.mermaPercent)) / 100;
  const utilidadPct = parseJewelryPercent(String(input.utilityPercent)) / 100;

  const adjustedWeight = w * (1 + mermaPct);
  const baseCost = adjustedWeight * precioMetal;
  const totalCost =
    baseCost +
    Math.max(0, input.stonesCost) +
    Math.max(0, input.laborCost) +
    Math.max(0, input.otherCosts);
  return totalCost * (1 + utilidadPct);
}

export function parseJewelryMoneyField(raw: string): number {
  return Math.max(0, parseMoneyInput(raw));
}
