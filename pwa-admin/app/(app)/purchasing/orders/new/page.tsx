import { PurchasingVariantSearchRequest } from "@/features/purchasing-document/infrastructure/purchasing-variant-search.request";
import { listSuppliersForGrid } from "@/features/purchasing-suppliers/actions/supplier.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import {
  PurchaseDocumentBuilder,
  PURCHASE_DOC_URL_PAGE,
  PURCHASE_DOC_URL_QUERY,
} from "@/shared/components/PurchaseDocumentBuilder";

export const dynamic = "force-dynamic";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function NewPurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = parseSp(sp, PURCHASE_DOC_URL_QUERY);
  const page = Math.max(1, parseInt(parseSp(sp, PURCHASE_DOC_URL_PAGE) || "1", 10) || 1);

  const [variantSearch, suppliersResult, storages, taxes] = await Promise.all([
    PurchasingVariantSearchRequest.search({ q, page, pageSize: 10 }),
    listSuppliersForGrid(),
    listStoragesForPage(),
    listTaxesForPage(),
  ]);

  return (
    <div className="min-h-0 min-w-0" data-test-id="purchase-orders-new-page">
      <PurchaseDocumentBuilder
        mode="purchase_order"
        variantSearch={variantSearch}
        searchQuery={q}
        searchPage={page}
        suppliers={suppliersResult.rows}
        storages={storages}
        taxes={taxes}
      />
    </div>
  );
}
