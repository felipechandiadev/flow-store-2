/**
 * Empresa activa del StockControl en localStorage (por dispositivo).
 */

const STORAGE_KEY = "flowstore-stock-company";

export type StockCompanyConfig = {
  id: string;
  razonSocial: string;
  nombreFantasia: string | null;
  rut?: string | null;
  savedAt: string;
};

export function readStockCompany(): StockCompanyConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StockCompanyConfig>;
    if (!parsed?.id || !parsed.razonSocial) return null;
    return {
      id: String(parsed.id),
      razonSocial: String(parsed.razonSocial),
      nombreFantasia:
        parsed.nombreFantasia != null && String(parsed.nombreFantasia).trim() !== ""
          ? String(parsed.nombreFantasia)
          : null,
      rut:
        parsed.rut != null && String(parsed.rut).trim() !== ""
          ? String(parsed.rut).trim()
          : null,
      savedAt:
        parsed.savedAt && typeof parsed.savedAt === "string"
          ? parsed.savedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeStockCompany(
  company: Omit<StockCompanyConfig, "savedAt">,
): StockCompanyConfig {
  const value: StockCompanyConfig = {
    id: company.id,
    razonSocial: company.razonSocial,
    nombreFantasia: company.nombreFantasia ?? null,
    rut:
      company.rut != null && String(company.rut).trim() !== ""
        ? String(company.rut).trim()
        : null,
    savedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // ignore
    }
  }
  return value;
}

export function clearStockCompany(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
