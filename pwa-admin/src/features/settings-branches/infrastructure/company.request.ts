import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}

export type CurrentCompany = {
  /** Puede ser `null` si el backend no tiene empresa en BD (placeholder de nombre sin uuid). */
  id: string | null;
  razonSocial: string;
  isActive?: boolean;
};

/** Respuesta de GET /api/company según el backend, para visualización. */
export type CompanyDetails = {
  id: string | null;
  razonSocial: string;
  nombreFantasia: string | null;
  businessActivity: string | null;
  rut: string | null;
  defaultCurrency: string;
  /** ISO 8601 o `null` */
  fiscalYearStart: string | null;
  isActive: boolean;
  settings: Record<string, unknown>;
  bankAccounts: unknown[];
};

type CompanyApiResponse = {
  id?: string | null;
  razonSocial?: string;
  nombreFantasia?: string | null;
  businessActivity?: string | null;
  rut?: string | null;
  defaultCurrency?: string;
  fiscalYearStart?: string | null;
  isActive?: boolean;
  settings?: Record<string, unknown> | null;
  bankAccounts?: unknown[] | null;
};

function isUuidString(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());
}

function parseFiscalYearStart(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === "") {
    return null;
  }
  const s = String(raw);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return s;
}

export class CompanyRequest {
  /** Detalle de la empresa (primera activa en BD), según backend. */
  static async getDetails(): Promise<CompanyDetails | null> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("company"), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as CompanyApiResponse;
      if (data?.razonSocial == null) {
        return null;
      }
      const rawId = data.id != null && String(data.id).trim() !== "" ? String(data.id).trim() : null;
      const id = rawId && isUuidString(rawId) ? rawId : null;
      return {
        id,
        razonSocial: data.razonSocial,
        nombreFantasia: data.nombreFantasia != null && String(data.nombreFantasia).trim() !== "" ? String(data.nombreFantasia) : null,
        businessActivity: data.businessActivity != null && String(data.businessActivity).trim() !== "" ? String(data.businessActivity) : null,
        rut: data.rut != null && String(data.rut).trim() !== "" ? String(data.rut) : null,
        defaultCurrency: data.defaultCurrency != null && String(data.defaultCurrency).trim() !== "" ? String(data.defaultCurrency) : "CLP",
        fiscalYearStart: parseFiscalYearStart(
          data.fiscalYearStart != null ? String(data.fiscalYearStart) : null,
        ),
        isActive: data.isActive !== false,
        settings: data.settings && typeof data.settings === "object" && !Array.isArray(data.settings) ? data.settings : {},
        bankAccounts: Array.isArray(data.bankAccounts) ? data.bankAccounts : [],
      };
    } catch {
      return null;
    }
  }

  /** Empresa activa (alias reducido para flujos que solo requieren id/nombre). */
  static async getCurrent(): Promise<CurrentCompany | null> {
    const details = await this.getDetails();
    if (!details) {
      return null;
    }
    return {
      id: details.id,
      razonSocial: details.razonSocial,
      isActive: details.isActive,
    };
  }
}
