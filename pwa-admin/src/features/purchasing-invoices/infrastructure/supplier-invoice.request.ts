import type { CreateSupplierInvoiceInput, SupplierInvoiceListResult } from "../types/supplier-invoice.types";

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

export class SupplierInvoiceRequest {
  static async list(opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {}) {
    const params = new URLSearchParams();
    if (opts.page) params.set("page", String(opts.page));
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.supplierId) params.set("supplierId", opts.supplierId);
    if (opts.search) params.set("search", opts.search);
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`supplier-invoices?${params.toString()}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let msg = "No se pudo listar facturas de proveedor";
      try {
        const data = text ? (JSON.parse(text) as any) : null;
        const m = data?.message;
        if (Array.isArray(m)) {
          msg = m.map(String).join("; ");
        } else if (typeof m === "string" && m.trim()) {
          msg = m;
        }
      } catch {
        // keep default msg
      }
      throw new Error(`${msg} (HTTP ${res.status})`);
    }
    return (await res.json()) as SupplierInvoiceListResult;
  }

  static async create(input: CreateSupplierInvoiceInput) {
    const payload = {
      ...input,
      metadata: {
        links: input.links ?? {},
      },
    };
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`supplier-invoices`), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(typeof data.message === "string" ? data.message : "No se pudo crear la factura");
    }
    return res.json();
  }
}

