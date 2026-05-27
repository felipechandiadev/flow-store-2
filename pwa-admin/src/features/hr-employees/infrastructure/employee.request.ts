import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { EmployeeGridRow, EmployeeListResult } from "../types/employee.types";

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
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

export class EmployeeRequest {
  static async list(opts: {
    includeTerminated?: boolean;
    status?: string;
    branchId?: string;
    companyId?: string;
  } = {}): Promise<EmployeeGridRow[]> {
    const params = new URLSearchParams();
    if (opts.includeTerminated) params.set("includeTerminated", "true");
    if (opts.status) params.set("status", opts.status);
    if (opts.branchId) params.set("branchId", opts.branchId);
    if (opts.companyId) params.set("companyId", opts.companyId);
    const qs = params.toString();
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`employees${qs ? `?${qs}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudieron listar empleados (HTTP ${res.status})`);
    }
    const json = (await res.json()) as EmployeeListResult;
    if (!json.success || !Array.isArray(json.data)) {
      return [];
    }
    return json.data as EmployeeGridRow[];
  }

  static async createPerson(payload: {
    firstName: string;
    lastName?: string;
    documentType: string;
    documentNumber: string;
    email?: string;
    phone?: string;
  }): Promise<{ success: true; personId: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("persons"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "NATURAL",
        firstName: payload.firstName,
        lastName: payload.lastName,
        documentType: payload.documentType,
        documentNumber: payload.documentNumber,
        email: payload.email,
        phone: payload.phone,
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      person?: { id?: string };
    };
    if (!res.ok) {
      return {
        success: false,
        error: json.message || `No se pudo crear la persona (HTTP ${res.status})`,
      };
    }
    const personId = json.person?.id;
    if (!json.success || !personId) {
      return { success: false, error: json.message || "Respuesta inválida al crear persona." };
    }
    return { success: true, personId };
  }

  static async create(payload: {
    personId: string;
    branchId?: string | null;
    employmentType: string;
    hireDate: string;
    baseSalary?: string | null;
  }): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("employees"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        personId: payload.personId,
        branchId: payload.branchId ?? undefined,
        employmentType: payload.employmentType,
        hireDate: payload.hireDate,
        baseSalary: payload.baseSalary ?? undefined,
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      data?: { id?: string };
    };
    if (!res.ok) {
      return {
        success: false,
        error: json.message || `No se pudo crear el empleado (HTTP ${res.status})`,
      };
    }
    const id = json.data?.id;
    if (!json.success || !id) {
      return { success: false, error: json.message || "Respuesta inválida al crear empleado." };
    }
    return { success: true, id };
  }
}
