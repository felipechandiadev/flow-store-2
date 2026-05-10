import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PosCustomerSearchResponse } from "../types/pos-customer.types";

export class CustomersPosRequest {
  static async search(input: { query?: string; page?: number; pageSize?: number }): Promise<PosCustomerSearchResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const qs = new URLSearchParams();
    if (input.query?.trim()) qs.set("query", input.query.trim());
    qs.set("page", String(Math.max(1, input.page ?? 1)));
    qs.set("pageSize", String(Math.min(50, Math.max(1, input.pageSize ?? 15))));

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

      const res = await fetch(`${base}/api/customers/search?${qs.toString()}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          (typeof data?.message === "string" && data.message) ||
          (Array.isArray(data?.message) ? (data.message as string[]).join("; ") : null) ||
          `HTTP ${res.status}`;
        return { success: false, message: String(msg) };
      }

      if (data?.success !== true || !Array.isArray(data?.customers)) {
        return { success: false, message: "Respuesta inválida del servidor" };
      }

      const customers = (data.customers as unknown[]).map((raw) => {
        const c = raw as Record<string, unknown>;
        return {
          customerId: String(c.customerId ?? ""),
          displayName: String(c.displayName ?? ""),
          documentNumber: c.documentNumber != null ? String(c.documentNumber) : null,
          phone: c.phone != null ? String(c.phone) : null,
          email: c.email != null ? String(c.email) : null,
        };
      });

      return {
        success: true,
        page: Number(data.page) || 1,
        pageSize: Number(data.pageSize) || 10,
        total: Number(data.total) || customers.length,
        customers,
      };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }
}
