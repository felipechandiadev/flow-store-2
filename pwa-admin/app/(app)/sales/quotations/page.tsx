import { Suspense } from "react";
import { listQuotationsAction } from "@/features/quotations/actions/quotations.action";
import type { QuotationEffectiveStatus } from "@/features/quotations/types/quotation.types";
import { QuotationsPageContent } from "./QuotationsPageContent";

export const dynamic = "force-dynamic";

const STATUS_VALUES: QuotationEffectiveStatus[] = [
  "ACTIVE",
  "EXPIRED",
  "CONVERTED",
  "CANCELLED",
];

function parseStatus(value: unknown): QuotationEffectiveStatus | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v !== "string") return undefined;
  const upper = v.toUpperCase();
  return (STATUS_VALUES as string[]).includes(upper)
    ? (upper as QuotationEffectiveStatus)
    : undefined;
}

function parseStr(value: unknown): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const filters = {
    effectiveStatus: parseStatus(sp.effectiveStatus),
    search: parseStr(sp.search),
    customerId: parseStr(sp.customerId),
    branchId: parseStr(sp.branchId),
    pointOfSaleId: parseStr(sp.pointOfSaleId),
    dateFrom: parseStr(sp.dateFrom),
    dateTo: parseStr(sp.dateTo),
  };

  const res = await listQuotationsAction(filters);

  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground md:p-6">
          Cargando…
        </div>
      }
    >
      <QuotationsPageContent
        initialItems={res.success ? res.items : []}
        initialTotal={res.success ? res.total : 0}
        loadError={res.success ? null : res.error}
        initialFilters={filters}
      />
    </Suspense>
  );
}
