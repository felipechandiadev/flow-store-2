import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PosProductSearchResponse } from "../types/pos-product.types";

export class ProductsPosRequest {
  static async search(input: {
    query?: string;
    priceListId: string;
    branchId?: string | null;
    page: number;
    pageSize: number;
  }): Promise<PosProductSearchResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const qs = new URLSearchParams();
    if (input.query?.trim()) qs.set("query", input.query.trim());
    qs.set("priceListId", input.priceListId);
    if (input.branchId?.trim()) qs.set("branchId", input.branchId.trim());
    qs.set("page", String(Math.max(1, input.page)));
    qs.set("pageSize", String(Math.max(1, input.pageSize)));

    try {
      const res = await fetch(`${base}/api/products/pos/search?${qs.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

      if (data?.success !== true) {
        return { success: false, message: "Respuesta inválida del servidor" };
      }

      return data as unknown as PosProductSearchResponse;
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }
}
