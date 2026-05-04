import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";

const IVA_NAME_RE = /^iva$/i;

/**
 * Tasa IVA en porcentaje desde el listado de impuestos (primer nombre que coincide con "iva").
 * Si no hay coincidencia, 19.
 */
export function ivaRatePercentFromTaxList(taxes: TaxListItem[]): number {
  const active = taxes.filter((t) => t.isActive !== false);
  const match = active.find((t) => IVA_NAME_RE.test(String(t.name ?? "").trim()));
  const r = match?.rate;
  if (typeof r === "number" && Number.isFinite(r) && r >= 0) {
    return r;
  }
  return 19;
}

/** Tasa y opcionalmente `taxId` para líneas de documento (primer impuesto con nombre IVA). */
export function pickIvaTaxForLines(taxes: TaxListItem[]): { taxId?: string; rate: number } {
  const active = taxes.filter((t) => t.isActive !== false);
  const match = active.find((t) => IVA_NAME_RE.test(String(t.name ?? "").trim()));
  if (match && typeof match.rate === "number" && Number.isFinite(match.rate)) {
    return { taxId: match.id, rate: match.rate };
  }
  return { rate: ivaRatePercentFromTaxList(taxes) };
}
