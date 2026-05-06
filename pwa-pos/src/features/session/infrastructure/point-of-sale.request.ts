import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { ListPointsOfSaleResult } from "../types/point-of-sale.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export class PointOfSaleRequest {
  static async findAll(includeInactive = false): Promise<ListPointsOfSaleResult> {
    const headers = await authHeaders();
    const q = includeInactive ? "?includeInactive=true" : "?includeInactive=false";
    try {
      const res = await fetch(`${apiUrl("points-of-sale")}${q}`, { method: "GET", headers, cache: "no-store" });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText, pointsOfSale: [] };
      }
      const data = (await res.json()) as { pointsOfSale?: any[] };
      return { success: true, pointsOfSale: Array.isArray(data?.pointsOfSale) ? (data.pointsOfSale as any) : [] };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar puntos de venta";
      return { success: false, error: err, pointsOfSale: [] };
    }
  }
}

