import { PurchasingVariantSearchRequest } from "@/features/purchasing-document/infrastructure/purchasing-variant-search.request";
import { listSuppliersForGrid } from "@/features/purchasing-suppliers/actions/supplier.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { createDirectReceptionAction } from "@/features/receptions/actions/reception.action";
import {
  PurchaseDocumentBuilder,
  PURCHASE_DOC_URL_LIMIT,
  PURCHASE_DOC_URL_PAGE,
  PURCHASE_DOC_URL_QUERY,
  clampPurchaseDocVariantSearchPageSize,
  PURCHASE_DOC_VARIANT_SEARCH_DEFAULT_PAGE_SIZE,
} from "@/shared/components/PurchaseDocumentBuilder";

export const dynamic = "force-dynamic";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function NewReceptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = parseSp(sp, PURCHASE_DOC_URL_QUERY);
  const page = Math.max(1, parseInt(parseSp(sp, PURCHASE_DOC_URL_PAGE) || "1", 10) || 1);
  const limitRaw = parseSp(sp, PURCHASE_DOC_URL_LIMIT);
  const limitParsed = limitRaw ? parseInt(limitRaw, 10) : NaN;
  const pageSize = Number.isFinite(limitParsed)
    ? clampPurchaseDocVariantSearchPageSize(limitParsed)
    : PURCHASE_DOC_VARIANT_SEARCH_DEFAULT_PAGE_SIZE;

  const [variantSearch, suppliersResult, storages, taxes, branches] = await Promise.all([
    PurchasingVariantSearchRequest.search({ q, page, pageSize }),
    listSuppliersForGrid(),
    listStoragesForPage(),
    listTaxesForPage(),
    listBranchesForSettingsPage(),
  ]);

  const branchId = branches[0]?.id ?? "";

  return (
    <div className="min-h-0 min-w-0" data-test-id="receptions-new-page">
      <PurchaseDocumentBuilder
        mode="reception"
        variantSearch={variantSearch}
        searchQuery={q}
        searchPage={page}
        suppliers={suppliersResult.rows}
        storages={storages}
        taxes={taxes}
        branchId={branchId}
        onSaveReception={createDirectReceptionAction}
      />
    </div>
  );
}
