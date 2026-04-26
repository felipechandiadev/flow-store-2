import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PointOfSaleListItem } from "../types/point-of-sale.types";

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

export class PointOfSaleRequest {
  static async findAll(): Promise<{ success: true; pointsOfSale: PointOfSaleListItem[] } | { success: false; error: string; pointsOfSale: [] }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("points-of-sale"), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText, pointsOfSale: [] };
      }
      const data = (await res.json()) as { success?: boolean; pointsOfSale?: PointOfSaleListItem[] };
      if (data?.pointsOfSale && Array.isArray(data.pointsOfSale)) {
        return { success: true, pointsOfSale: data.pointsOfSale };
      }
      return { success: true, pointsOfSale: [] };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar puntos de venta";
      return { success: false, error: err, pointsOfSale: [] };
    }
  }

  static async create(body: {
    name: string;
    deviceId?: string | null;
  }): Promise<{ success: true; pointOfSale: PointOfSaleListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("points-of-sale"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: body.name,
          deviceId: body.deviceId && body.deviceId.trim() ? body.deviceId.trim() : null,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; pointOfSale?: PointOfSaleListItem; error?: string };
      if (!res.ok) {
        return { success: false, error: data.error || res.statusText };
      }
      if (data.success && data.pointOfSale) {
        return { success: true, pointOfSale: data.pointOfSale };
      }
      return { success: false, error: data.error || "No se pudo crear el punto de venta" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear punto de venta";
      return { success: false, error: err };
    }
  }

  static async remove(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`points-of-sale/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || "No se pudo eliminar" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar";
      return { success: false, error: err };
    }
  }
}
