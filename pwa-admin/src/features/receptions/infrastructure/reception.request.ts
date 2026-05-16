import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CreateDirectReceptionInput,
  ReceptionGridRow,
  ReceptionListForGridResult,
  ReceptionDetailForReturn,
  ReceptionLineForReturn,
} from "../types/reception.types";

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

function normalizeReceptionDetail(raw: unknown): ReceptionDetailForReturn {
  if (!raw || typeof raw !== "object") {
    throw new Error("Respuesta de recepción inválida");
  }
  const o = raw as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("Recepción sin id");
  }
  const linesRaw = o.lines;
  const lines: ReceptionLineForReturn[] = [];
  if (Array.isArray(linesRaw)) {
    for (const row of linesRaw) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const lr = row as Record<string, unknown>;
      const lid = lr.id;
      if (typeof lid !== "string" || !lid.trim()) {
        continue;
      }
      const productName =
        typeof lr.productName === "string" && lr.productName.trim()
          ? lr.productName.trim()
          : "Ítem";
      lines.push({
        id: lid.trim(),
        productId: typeof lr.productId === "string" ? lr.productId : null,
        productVariantId: typeof lr.productVariantId === "string" ? lr.productVariantId : null,
        productName,
        sku: typeof lr.sku === "string" ? lr.sku : null,
        variantName: typeof lr.variantName === "string" ? lr.variantName : null,
        quantity: Number(lr.quantity) || 0,
        receivedQuantity: lr.receivedQuantity != null ? Number(lr.receivedQuantity) : null,
        unitPrice: Math.max(0, Number(lr.unitPrice) || 0),
      });
    }
  }
  return {
    id: id.trim(),
    supplierId: typeof o.supplierId === "string" ? o.supplierId : null,
    storageId: typeof o.storageId === "string" ? o.storageId : null,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : undefined,
    lines,
  };
}

export class ReceptionRequest {
  static async listForGrid(opts: { limit?: number; offset?: number } = {}): Promise<ReceptionListForGridResult> {
    const limit = Math.min(200, Math.max(1, Math.round(opts.limit ?? 25)));
    const offset = Math.max(0, Math.round(opts.offset ?? 0));
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`receptions?limit=${limit}&offset=${offset}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as
        | null
        | { message?: unknown; error?: unknown; success?: unknown };
      const msg =
        typeof body?.message === "string"
          ? body.message
          : Array.isArray(body?.message)
            ? body.message.map(String).join("; ")
            : typeof body?.error === "string"
              ? body.error
              : `HTTP ${res.status}`;
      throw new Error(`No se pudieron listar recepciones (${msg})`);
    }
    const json = (await res.json()) as {
      rows?: ReceptionGridRow[];
      count?: number;
      limit?: number;
      offset?: number;
    };
    const rows = (json.rows ?? []).map((r) => ({
      ...r,
      id: String(r?.id ?? ""),
    })) as ReceptionGridRow[];
    return {
      rows: rows.filter((r) => r.id),
      total: typeof json.count === "number" ? json.count : rows.length,
      limit: typeof json.limit === "number" ? json.limit : limit,
      offset: typeof json.offset === "number" ? json.offset : offset,
    };
  }

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
        reference: body.reference?.trim() || undefined,
        documentType: body.documentType,
        notes:
          body.notes != null && String(body.notes).trim() !== ""
            ? String(body.notes).trim()
            : undefined,
        supplierDocumentPayment: body.supplierDocumentPayment ?? undefined,
        supplierFiscalAmounts: body.supplierFiscalAmounts ?? undefined,
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

  static async getById(receptionId: string): Promise<ReceptionDetailForReturn> {
    const id = receptionId.trim();
    if (!id) {
      throw new Error("ID de recepción requerido");
    }
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`receptions/${encodeURIComponent(id)}`), {
      method: "GET",
      headers,
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
    const json = await res.json();
    return normalizeReceptionDetail(json);
  }

  static async resolveBySupplierDocumentRef(
    supplierId: string,
    documentRef: string,
  ): Promise<ReceptionDetailForReturn> {
    const sid = supplierId.trim();
    const ref = documentRef.trim();
    if (!sid || !ref) {
      throw new Error("Proveedor y referencia de documento son obligatorios");
    }
    const params = new URLSearchParams({ supplierId: sid, documentRef: ref });
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`receptions/resolve?${params.toString()}`), {
      method: "GET",
      headers,
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
    const json = await res.json();
    return normalizeReceptionDetail(json);
  }
}
