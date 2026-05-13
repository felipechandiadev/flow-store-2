import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PosCustomerSearchResponse } from "../types/pos-customer.types";
import type {
  PosCustomerDetail,
  PosCustomerDetailBundle,
  PosCustomerPaymentRow,
  PosCustomerQuotaRow,
} from "../types/pos-customer-detail.types";
import type { PosCreateCustomerInput, PosCreateCustomerResult } from "../types/pos-customer-create.types";

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

  static async getCustomerDetailBundle(customerId: string): Promise<PosCustomerDetailBundle> {
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

    const id = customerId.trim();
    if (!id) {
      return { success: false, message: "Cliente no especificado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const url = (path: string) => `${base}/api${path}`;

    try {
      const [cRes, pRes, qRes] = await Promise.all([
        fetch(url(`/customers/${encodeURIComponent(id)}`), { headers, cache: "no-store" }),
        fetch(url(`/customers/${encodeURIComponent(id)}/payments`), { headers, cache: "no-store" }),
        fetch(url(`/customers/${encodeURIComponent(id)}/pending-quotas`), { headers, cache: "no-store" }),
      ]);

      const cData = (await cRes.json().catch(() => ({}))) as Record<string, unknown>;
      if (!cRes.ok || !cData?.customer) {
        const msg =
          (typeof cData?.message === "string" && cData.message) ||
          `No se pudo cargar el cliente (${cRes.status})`;
        return { success: false, message: String(msg) };
      }

      const raw = cData.customer as Record<string, unknown>;
      const customer: PosCustomerDetail = {
        customerId: String(raw.customerId ?? id),
        displayName: String(raw.displayName ?? ""),
        documentType: raw.documentType != null ? String(raw.documentType) : null,
        documentNumber: raw.documentNumber != null ? String(raw.documentNumber) : null,
        email: raw.email != null ? String(raw.email) : null,
        phone: raw.phone != null ? String(raw.phone) : null,
        address: raw.address != null ? String(raw.address) : null,
        creditLimit: Number(raw.creditLimit ?? 0),
        usedCredit: Number(raw.usedCredit ?? 0),
        availableCredit: Number(raw.availableCredit ?? 0),
        paymentDayOfMonth:
          raw.paymentDayOfMonth != null && raw.paymentDayOfMonth !== ""
            ? Number(raw.paymentDayOfMonth)
            : null,
        isActive: Boolean(raw.isActive),
        notes: raw.notes != null ? String(raw.notes) : null,
        createdAt: raw.createdAt != null ? String(raw.createdAt) : "",
        updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : "",
      };

      const pData = (await pRes.json().catch(() => ({}))) as Record<string, unknown>;
      const paymentsRaw = pRes.ok && Array.isArray(pData?.payments) ? (pData.payments as unknown[]) : [];
      const payments: PosCustomerPaymentRow[] = paymentsRaw.map((row) => {
        const p = row as Record<string, unknown>;
        return {
          id: String(p.id ?? ""),
          documentNumber: p.documentNumber != null ? String(p.documentNumber) : null,
          type: p.type != null ? String(p.type) : null,
          status: p.status != null ? String(p.status) : null,
          total: Number(p.total ?? 0),
          paymentMethod: p.paymentMethod != null ? String(p.paymentMethod) : null,
          createdAt: p.createdAt != null ? String(p.createdAt) : "",
        };
      });

      const qData = (await qRes.json().catch(() => ({}))) as Record<string, unknown>;
      const quotasRaw = qRes.ok && Array.isArray(qData?.quotas) ? (qData.quotas as unknown[]) : [];
      const quotas: PosCustomerQuotaRow[] = quotasRaw.map((row) => {
        const q = row as Record<string, unknown>;
        return {
          id: String(q.id ?? ""),
          transactionId: q.transactionId != null ? String(q.transactionId) : null,
          documentNumber: q.documentNumber != null ? String(q.documentNumber) : null,
          amount: Number(q.amount ?? 0),
          dueDate: q.dueDate != null ? String(q.dueDate) : null,
          createdAt: q.createdAt != null ? String(q.createdAt) : null,
        };
      });

      return { success: true, customer, payments, quotas };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }

  static async create(body: PosCreateCustomerInput): Promise<PosCreateCustomerResult> {
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

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    try {
      const res = await fetch(`${base}/api/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          personType: body.personType,
          firstName: body.firstName.trim(),
          lastName: body.lastName?.trim() || undefined,
          documentType: body.documentType,
          documentNumber: body.documentNumber.trim(),
          email: body.email?.trim() || undefined,
          phone: body.phone?.trim() || undefined,
          address: body.address?.trim() || undefined,
          creditLimit: body.creditLimit,
          paymentDayOfMonth: body.paymentDayOfMonth,
          notes: body.notes?.trim() || undefined,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string"
            ? m
            : "No se pudo crear el cliente";
        return { success: false, message: String(msg) };
      }
      const cust = data.customer as Record<string, unknown> | undefined;
      const id = cust?.customerId != null ? String(cust.customerId) : "";
      if (data.success === false || !id) {
        return {
          success: false,
          message: typeof data.error === "string" ? data.error : "No se pudo crear el cliente",
        };
      }
      return { success: true, customerId: id };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }
}
