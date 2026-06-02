import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { RemunerationGridRow, RemunerationListResult } from "../types/remuneration.types";

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

export class RemunerationRequest {
  static async list(opts: {
    employeeId?: string;
    status?: string;
  } = {}): Promise<RemunerationGridRow[]> {
    const params = new URLSearchParams();
    if (opts.employeeId) params.set("employeeId", opts.employeeId);
    if (opts.status) params.set("status", opts.status);
    const qs = params.toString();
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`remunerations${qs ? `?${qs}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudieron listar remuneraciones (HTTP ${res.status})`);
    }
    const json = (await res.json()) as RemunerationListResult;
    if (!json.success || !Array.isArray(json.data)) {
      return [];
    }
    return json.data as RemunerationGridRow[];
  }

  static async create(payload: {
    employeeId: string;
    date: string;
    resultCenterId?: string | null;
    lines: Array<{ typeId: string; amount: number }>;
    plannedPayments?: Array<{ dueDate: string; amount: number }>;
  }): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("remunerations"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        employeeId: payload.employeeId,
        date: payload.date,
        resultCenterId: payload.resultCenterId ?? undefined,
        lines: payload.lines,
        plannedPayments: payload.plannedPayments,
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
        error: json.message || `No se pudo crear la remuneración (HTTP ${res.status})`,
      };
    }
    const id = json.data?.id;
    if (!json.success || !id) {
      return { success: false, error: json.message || "Respuesta inválida al crear remuneración." };
    }
    return { success: true, id };
  }
}
