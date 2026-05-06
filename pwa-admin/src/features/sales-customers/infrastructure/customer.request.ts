import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CreateCustomerFormInput, CustomerListResult, CustomerListRow } from "../types/customer.types";

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

function normalizeRow(raw: unknown): CustomerListRow | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const customerId = o.customerId != null ? String(o.customerId) : "";
  const personId = o.personId != null ? String(o.personId) : "";
  if (!customerId || !personId) {
    return null;
  }
  return {
    id: customerId,
    customerId,
    personId,
    displayName: o.displayName != null ? String(o.displayName) : "—",
    documentNumber: o.documentNumber != null ? String(o.documentNumber) : null,
    email: o.email != null ? String(o.email) : null,
    phone: o.phone != null ? String(o.phone) : null,
    creditLimit: typeof o.creditLimit === "number" && Number.isFinite(o.creditLimit) ? o.creditLimit : Number(o.creditLimit) || 0,
    currentBalance:
      typeof o.currentBalance === "number" && Number.isFinite(o.currentBalance)
        ? o.currentBalance
        : Number(o.currentBalance) || 0,
    availableCredit:
      typeof o.availableCredit === "number" && Number.isFinite(o.availableCredit)
        ? o.availableCredit
        : Number(o.availableCredit) || 0,
    paymentDayOfMonth:
      typeof o.paymentDayOfMonth === "number" && Number.isFinite(o.paymentDayOfMonth)
        ? o.paymentDayOfMonth
        : o.paymentDayOfMonth != null
          ? Number(o.paymentDayOfMonth)
          : null,
    isActive: o.isActive !== false,
    createdAt: o.createdAt != null ? String(o.createdAt) : undefined,
    updatedAt: o.updatedAt != null ? String(o.updatedAt) : undefined,
  };
}

export class CustomerRequest {
  static async list(opts: { page?: number; pageSize?: number; query?: string } = {}): Promise<CustomerListResult> {
    const headers = await authHeaders();
    const p = Math.max(1, Math.round(Number(opts.page) || 1));
    const ps = Math.min(50, Math.max(1, Math.round(Number(opts.pageSize) || 50)));
    const q = new URLSearchParams();
    q.set("page", String(p));
    q.set("pageSize", String(ps));
    if (opts.query != null && String(opts.query).trim() !== "") {
      q.set("query", String(opts.query).trim());
    }
    const res = await fetch(apiUrl(`customers?${q.toString()}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    const json = (await res.json()) as Record<string, unknown>;
    const customersRaw = json.customers;
    const arr = Array.isArray(customersRaw) ? customersRaw : [];
    const customers = arr.map(normalizeRow).filter((x): x is CustomerListRow => x != null);
    const total = typeof json.total === "number" && Number.isFinite(json.total) ? json.total : customers.length;
    return {
      success: json.success === true,
      page: typeof json.page === "number" ? json.page : p,
      pageSize: typeof json.pageSize === "number" ? json.pageSize : ps,
      total,
      customers,
    };
  }

  static async create(
    body: CreateCustomerFormInput,
  ): Promise<{ success: true; customer: Record<string, unknown> } | { success: false; error: string }> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("customers"), {
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
      const msg = Array.isArray(m) ? m.map(String).join("; ") : typeof m === "string" ? m : "No se pudo crear el cliente";
      return { success: false, error: msg };
    }
    if (data.success === false) {
      return { success: false, error: typeof data.error === "string" ? data.error : "No se pudo crear el cliente" };
    }
    return { success: true, customer: data };
  }
}
