/**
 * Utilidades compartidas para headers de documentos imprimibles (A4 / preview React).
 */

/** Dirección para impresión: solo divide por saltos de línea, no por comas. */
export function formatCompanyAddressForPrint(address: string | null | undefined): string[] {
  const raw = address?.trim();
  if (!raw) return [];
  const byNl = raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (byNl.length > 1) return byNl;
  return [raw];
}

export function resolveCompanyPhoneFromSettings(settings: unknown): string | null {
  if (!settings || typeof settings !== "object") return null;
  const s = settings as Record<string, unknown>;
  const pick = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const pc = s.publicContact;
  if (pc && typeof pc === "object" && !Array.isArray(pc)) {
    const phone = pick((pc as Record<string, unknown>).phone);
    if (phone) return phone;
  }
  return pick(s.phone) ?? pick(s.telefono) ?? pick(s.companyPhone);
}

/** Teléfono de empresa: columna `phone` o, en legado, claves en `settings`. */
export function resolveCompanyPhone(company: {
  phone?: string | null;
  settings?: unknown;
} | null | undefined): string | null {
  const direct = (company?.phone ?? "").trim();
  if (direct) return direct;
  return resolveCompanyPhoneFromSettings(company?.settings);
}

export function buildCompanyInlineParts(parts: {
  rut?: string | null;
  phone?: string | null;
  email?: string | null;
}): string[] {
  const rut = (parts.rut ?? "").trim();
  const phone = (parts.phone ?? "").trim();
  const email = (parts.email ?? "").trim();
  return [
    rut ? `RUT: ${rut}` : "",
    phone ? `Tel: ${phone}` : "",
    email ? email : "",
  ].filter(Boolean);
}

/** CSS embebido en HTML de documentos A4 (header empresa + meta documento). */
export const DOCUMENT_HEADER_PRINT_CSS = `
  .companyHeader { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; }
  .companyKicker { margin: 0; text-transform: uppercase; letter-spacing: 0.08em; font-size: 9px; color: #6b7280; }
  .companyName { margin: 0.2rem 0; font-size: 22px; line-height: 1.1; font-weight: 800; color: #111827; }
  .companyAddress { margin: 0; font-size: 10px; color: #4b5563; }
  .companyInline { margin: 0.25rem 0 0; font-size: 10px; color: #374151; }
  .documentMeta { text-align: right; }
  .documentTitle { margin: 0; font-size: 23px; line-height: 1; font-weight: 900; color: #1e3a8a; }
  .documentDate { margin: 0.4rem 0 0; font-size: 11px; font-weight: 600; color: #1f2937; }
  .documentFolio { margin: 0.5rem 0 0; font-size: 11px; font-weight: 700; color: #1f2937; }
  .separator { margin: 1.1rem 0; height: 1px; background: rgba(17, 24, 39, 0.22); }
`.trim();
