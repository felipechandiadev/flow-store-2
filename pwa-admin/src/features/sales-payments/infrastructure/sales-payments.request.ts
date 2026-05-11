import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  SalesPaymentMethod,
  SalesPaymentRow,
  SalesPaymentStatus,
  SalesPaymentsListResult,
} from "../types/sales-payment.types";

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
  const activeCompanyId = (session?.user as any)?.activeCompanyId as
    | string
    | null
    | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

export interface ListSalesPaymentsParams {
  page?: number;
  limit?: number;
  status?: SalesPaymentStatus;
  paymentMethod?: SalesPaymentMethod;
  branchId?: string;
  pointOfSaleId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function deriveCustomerName(
  customer: Record<string, unknown> | null | undefined,
): string | null {
  if (!customer || typeof customer !== "object") return null;
  const person = (customer as { person?: Record<string, unknown> }).person;
  if (!person || typeof person !== "object") return null;
  const businessName =
    typeof person.businessName === "string" ? person.businessName.trim() : "";
  if (businessName) return businessName;
  const firstName =
    typeof person.firstName === "string" ? person.firstName.trim() : "";
  const lastName =
    typeof person.lastName === "string" ? person.lastName.trim() : "";
  const full = `${firstName} ${lastName}`.trim();
  return full || null;
}

function deriveCustomerDocument(
  customer: Record<string, unknown> | null | undefined,
): string | null {
  if (!customer || typeof customer !== "object") return null;
  const person = (customer as { person?: Record<string, unknown> }).person;
  if (!person || typeof person !== "object") return null;
  return typeof person.documentNumber === "string" &&
    person.documentNumber.trim()
    ? person.documentNumber.trim()
    : null;
}

function normalizeRow(raw: unknown): SalesPaymentRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  const customer = o.customer as Record<string, unknown> | null | undefined;
  const branch = o.branch as Record<string, unknown> | null | undefined;
  const pos = o.pointOfSale as Record<string, unknown> | null | undefined;
  return {
    id,
    documentNumber:
      typeof o.documentNumber === "string" ? o.documentNumber : "",
    externalReference:
      typeof o.externalReference === "string" && o.externalReference.trim()
        ? o.externalReference
        : null,
    documentType:
      typeof o.documentType === "string" && o.documentType.trim()
        ? o.documentType
        : null,
    documentFolio:
      typeof o.documentFolio === "string" && o.documentFolio.trim()
        ? o.documentFolio
        : null,
    customerId:
      typeof o.customerId === "string" && o.customerId.trim()
        ? o.customerId
        : null,
    customerName: deriveCustomerName(customer),
    customerDocument: deriveCustomerDocument(customer),
    branchId:
      typeof o.branchId === "string" && o.branchId.trim() ? o.branchId : null,
    branchName:
      branch && typeof branch.name === "string" && branch.name.trim()
        ? branch.name
        : null,
    pointOfSaleId:
      typeof o.pointOfSaleId === "string" && o.pointOfSaleId.trim()
        ? o.pointOfSaleId
        : null,
    pointOfSaleName:
      pos && typeof pos.name === "string" && pos.name.trim() ? pos.name : null,
    total: toNumber(o.total),
    amountPaid: toNumber(o.amountPaid),
    currency: typeof o.currency === "string" && o.currency ? o.currency : "CLP",
    paymentMethod: (o.paymentMethod as SalesPaymentMethod) ?? "CASH",
    status: (o.status as SalesPaymentStatus) ?? "CONFIRMED",
    relatedTransactionId:
      typeof o.relatedTransactionId === "string" && o.relatedTransactionId.trim()
        ? o.relatedTransactionId
        : null,
    notes: typeof o.notes === "string" && o.notes.trim() ? o.notes : null,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
  };
}

export class SalesPaymentsRequest {
  static async list(
    params: ListSalesPaymentsParams = {},
  ): Promise<
    | { success: true; data: SalesPaymentsListResult }
    | { success: false; error: string }
  > {
    try {
      const q = new URLSearchParams();
      q.set("type", "PAYMENT_IN");
      if (params.page != null) q.set("page", String(params.page));
      if (params.limit != null) q.set("limit", String(params.limit));
      if (params.status) q.set("status", params.status);
      if (params.paymentMethod) q.set("paymentMethod", params.paymentMethod);
      if (params.branchId) q.set("branchId", params.branchId);
      if (params.pointOfSaleId) q.set("pointOfSaleId", params.pointOfSaleId);
      if (params.customerId) q.set("customerId", params.customerId);
      if (params.dateFrom) q.set("dateFrom", params.dateFrom);
      if (params.dateTo) q.set("dateTo", params.dateTo);
      if (params.search) q.set("search", params.search);

      const res = await fetch(apiUrl(`transactions?${q.toString()}`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        data?: unknown[];
        total?: number;
        page?: number;
        limit?: number;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      const arr = Array.isArray(data?.data) ? data.data : [];
      const rows = arr
        .map(normalizeRow)
        .filter((x): x is SalesPaymentRow => x != null);
      return {
        success: true,
        data: {
          rows,
          total: typeof data?.total === "number" ? data.total : rows.length,
          page: typeof data?.page === "number" ? data.page : 1,
          limit:
            typeof data?.limit === "number" ? data.limit : params.limit ?? 25,
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar pagos",
      };
    }
  }
}
