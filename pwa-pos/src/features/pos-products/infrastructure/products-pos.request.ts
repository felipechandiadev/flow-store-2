import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PosProductSearchResponse } from "../types/pos-product.types";

export class ProductsPosRequest {
  static async search(input: {
    query?: string;
    priceListId: string;
    branchId?: string | null;
    pointOfSaleId?: string | null;
    page: number;
    pageSize: number;
  }): Promise<PosProductSearchResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const qs = new URLSearchParams();
    if (input.query?.trim()) qs.set("query", input.query.trim());
    qs.set("priceListId", input.priceListId);
    if (input.branchId?.trim()) qs.set("branchId", input.branchId.trim());
    if (input.pointOfSaleId?.trim()) qs.set("pointOfSaleId", input.pointOfSaleId.trim());
    qs.set("page", String(Math.max(1, input.page)));
    qs.set("pageSize", String(Math.max(1, input.pageSize)));

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
      const res = await fetch(`${base}/api/products/pos/search?${qs.toString()}`, {
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
        return { success: false, message: String(msg), statusCode: res.status };
      }

      if (data?.success !== true) {
        return { success: false, message: "Respuesta inválida del servidor", statusCode: res.status };
      }

      return data as unknown as PosProductSearchResponse;
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }

  static async getVariantStock(input: {
    variantId: string;
    pointOfSaleId: string;
  }): Promise<
    | {
        success: true;
        storageId: string;
        storageName: string | null;
        trackInventory: boolean;
        availableStock: number | null;
        availableStockBase: number | null;
      }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const qs = new URLSearchParams();
    qs.set("pointOfSaleId", input.pointOfSaleId.trim());

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
      const res = await fetch(
        `${base}/api/products/pos/variants/${encodeURIComponent(input.variantId.trim())}/stock-by-storage?${qs.toString()}`,
        { method: "GET", headers, cache: "no-store" },
      );
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          (typeof data?.message === "string" && data.message) ||
          (Array.isArray(data?.message) ? (data.message as string[]).join("; ") : null) ||
          `HTTP ${res.status}`;
        return { success: false, message: String(msg), statusCode: res.status };
      }
      if (data?.success !== true) {
        return { success: false, message: "Respuesta inválida del servidor", statusCode: res.status };
      }
      return {
        success: true,
        storageId: String(data.storageId ?? ""),
        storageName: (data.storageName as string | null) ?? null,
        trackInventory: Boolean(data.trackInventory),
        availableStock:
          data.availableStock === null || data.availableStock === undefined
            ? null
            : Number(data.availableStock),
        availableStockBase:
          data.availableStockBase === null || data.availableStockBase === undefined
            ? null
            : Number(data.availableStockBase),
      };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }
}
