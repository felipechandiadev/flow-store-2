import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CreateDirectReceptionInput } from "../types/reception.types";

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

export class ReceptionRequest {
  static async createDirect(input: CreateDirectReceptionInput & { userId: string }): Promise<unknown> {
    const { userId, ...body } = input;
    const headers = await authHeaders();
    const res = await fetch(apiUrl("receptions/direct"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...body,
        userId,
        storageId: body.storageId?.trim() || undefined,
        supplierId: body.supplierId?.trim() || undefined,
        dteNumber: body.dteNumber?.trim() || undefined,
        dteType: body.dteType,
        lines: body.lines.map((l) => ({
          productId: l.productId,
          productVariantId: l.productVariantId,
          productName: l.productName,
          sku: l.sku,
          quantity: l.quantity,
          receivedQuantity: l.receivedQuantity ?? l.quantity,
          unitPrice: l.unitPrice,
        })),
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const msg =
        typeof data.message === "string"
          ? data.message
          : Array.isArray(data.message)
            ? data.message.map(String).join("; ")
            : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return res.json();
  }
}
