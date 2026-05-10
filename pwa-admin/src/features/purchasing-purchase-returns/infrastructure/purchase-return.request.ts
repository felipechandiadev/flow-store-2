import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CreatePurchaseReturnInput, PurchaseReturnListResult } from "../types/purchase-return.types";

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
  const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

export class PurchaseReturnRequest {
  static async list(opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {}) {
    const params = new URLSearchParams();
    if (opts.page) params.set("page", String(opts.page));
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.supplierId) params.set("supplierId", opts.supplierId);
    if (opts.search) params.set("search", opts.search);
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`purchase-returns?${params.toString()}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo listar devoluciones (HTTP ${res.status})`);
    }
    return (await res.json()) as PurchaseReturnListResult;
  }

  static async create(input: CreatePurchaseReturnInput & { userId: string }): Promise<unknown> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("purchase-returns"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...input,
        metadata: { ...(input.metadata ?? {}), links: input.metadata?.links ?? {} },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(typeof data.message === "string" ? data.message : "No se pudo crear la devolución");
    }
    return data;
  }
}
