import { searchPosCustomersAction } from "@/features/customers/actions/customers-pos.action";
import {
  POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE,
  POS_CUSTOMER_SEARCH_MAX,
  POS_CUSTOMER_SEARCH_MIN,
} from "@/features/customers/lib/posCustomerSearchStorage";
import type { PosCustomerSearchInitial } from "@/features/customers/ui/PosCustomerSearchPanel";
import PosPaymentWorkspace from "./ui/PosPaymentWorkspace";

export const dynamic = "force-dynamic";

function parseSp(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const v = sp[key];
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : "";
  return typeof v === "string" ? v : "";
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Server Component: lee los `searchParams` que controlan el buscador de
 * clientes (`customerQuery`, `customerPage`, `customerPageSize`) y
 * realiza el primer fetch en el servidor. La data viaja por props al
 * `PosPaymentWorkspace`, que la pasa intacta al `PosCustomerSearchPanel`.
 *
 * Nota: el carrito y los pagos siguen siendo 100% client-side (cart
 * provider). Sólo la búsqueda de cliente está URL-driven.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const customerQuery = parseSp(sp, "customerQuery").trim();
  const customerPage = clamp(
    parseInt(parseSp(sp, "customerPage") || "1", 10),
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const customerPageSize = clamp(
    parseInt(
      parseSp(sp, "customerPageSize") ||
        String(POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE),
      10,
    ),
    POS_CUSTOMER_SEARCH_MIN,
    POS_CUSTOMER_SEARCH_MAX,
  );

  const res = await searchPosCustomersAction({
    query: customerQuery,
    page: customerPage,
    pageSize: customerPageSize,
  });

  const initialCustomerSearch: PosCustomerSearchInitial = res.success
    ? {
        query: customerQuery,
        page: res.page || customerPage,
        pageSize: res.pageSize || customerPageSize,
        items: res.customers,
        total: res.total,
        error: null,
      }
    : {
        query: customerQuery,
        page: customerPage,
        pageSize: customerPageSize,
        items: [],
        total: 0,
        error: res.message,
      };

  return (
    <div className="h-full min-h-0">
      <PosPaymentWorkspace initialCustomerSearch={initialCustomerSearch} />
    </div>
  );
}
