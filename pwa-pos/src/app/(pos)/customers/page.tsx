import {
  getCustomerPosDetailBundleAction,
  searchPosCustomersAction,
} from "@/features/customers/actions/customers-pos.action";
import {
  POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE,
  POS_CUSTOMER_SEARCH_MAX,
  POS_CUSTOMER_SEARCH_MIN,
} from "@/features/customers/lib/posCustomerSearchStorage";
import type { PosCustomerSearchInitial } from "@/features/customers/ui/PosCustomerSearchPanel";
import { POS_CUSTOMER_URL_KEYS } from "@/features/customers/ui/PosCustomerSearchPanel";
import type { PosCustomerDetailBundle } from "@/features/customers/types/pos-customer-detail.types";
import CustomersPageClient from "./ui/CustomersPageClient";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const customerQuery = parseSp(sp, POS_CUSTOMER_URL_KEYS.query).trim();
  const customerPage = clamp(
    parseInt(parseSp(sp, POS_CUSTOMER_URL_KEYS.page) || "1", 10),
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const customerPageSize = clamp(
    parseInt(
      parseSp(sp, POS_CUSTOMER_URL_KEYS.pageSize) || String(POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE),
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

  const customerIdParam = parseSp(sp, POS_CUSTOMER_URL_KEYS.selectedId).trim();
  const customerIdValid = !customerIdParam || UUID_RE.test(customerIdParam);

  let detailBundle: PosCustomerDetailBundle | null = null;
  if (customerIdParam && customerIdValid) {
    detailBundle = await getCustomerPosDetailBundleAction(customerIdParam);
  }

  return (
    <div className="h-full min-h-0">
      <CustomersPageClient
        initialCustomerSearch={initialCustomerSearch}
        customerIdParam={customerIdParam}
        customerIdValid={customerIdValid}
        detailBundle={detailBundle}
      />
    </div>
  );
}
