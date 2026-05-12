import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { ListCashSessionsResponse } from "../types/cash-session.types";
import type { CreateSaleApiBody } from "../lib/build-create-sale-payload";

export class CashSessionsRequest {
  static async listOpen(): Promise<ListCashSessionsResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await fetch(`${base}/api/cash-sessions?status=OPEN`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    return res.json();
  }

  static async open(input: { pointOfSaleId: string; openingAmount: number }): Promise<
    | { success: true; cashSession: { id: string } }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const userId = session?.user?.id;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
    if (!token || !userId) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await fetch(`${base}/api/cash-sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId,
        pointOfSaleId: input.pointOfSaleId,
        openingAmount: input.openingAmount,
      }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        (typeof data?.message === "string" && data.message) ||
        (Array.isArray(data?.message) ? data.message.join(", ") : null) ||
        data?.error ||
        res.statusText ||
        "No se pudo abrir la sesión de caja";
      return { success: false, message: msg, statusCode: res.status };
    }

    if (data?.success && data?.cashSession?.id) {
      return { success: true, cashSession: { id: data.cashSession.id } };
    }

    return { success: false, message: "Respuesta inesperada al abrir sesión" };
  }

  static async createSale(
    body: CreateSaleApiBody,
  ): Promise<
    | { success: true; transaction: { id: string; documentNumber: string } }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
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

    const res = await fetch(`${base}/api/cash-sessions/sales`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof data?.error === "string"
              ? data.error
              : res.statusText || "Error al registrar la venta";
      return { success: false, message: msg, statusCode: res.status };
    }

    const tx = data?.transaction as { id?: string; documentNumber?: string } | undefined;
    if (data?.success === true && tx?.id && tx?.documentNumber) {
      return {
        success: true,
        transaction: { id: String(tx.id), documentNumber: String(tx.documentNumber) },
      };
    }

    return { success: false, message: "Respuesta inesperada al registrar la venta" };
  }
}

