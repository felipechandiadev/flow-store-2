"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PosCustomerSearchRow, PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { PosCustomerDetailBundle } from "@/features/customers/types/pos-customer-detail.types";
import PosCustomerSearchPanel, {
  POS_CUSTOMER_URL_KEYS,
  type PosCustomerSearchInitial,
} from "@/features/customers/ui/PosCustomerSearchPanel";
import { PosCreateCustomerDialog } from "@/features/customers/ui/PosCreateCustomerDialog";
import PosCustomerDetailAside from "./PosCustomerDetailAside";

const PANEL_VH = 76;

type Props = {
  initialCustomerSearch: PosCustomerSearchInitial;
  customerIdParam: string;
  customerIdValid: boolean;
  detailBundle: PosCustomerDetailBundle | null;
};

export default function CustomersPageClient({
  initialCustomerSearch,
  customerIdParam,
  customerIdValid,
  detailBundle,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);

  const selectedForSearch: PosSaleCustomer | null = useMemo(() => {
    if (!detailBundle || !detailBundle.success) return null;
    const c = detailBundle.customer;
    return {
      customerId: c.customerId,
      name: c.displayName || "Cliente",
      document: c.documentNumber?.trim() ?? "",
      phone: c.phone?.trim() ?? "",
      email: c.email?.trim() || null,
    };
  }, [detailBundle]);

  const pushParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(sp.toString());
      mutate(p);
      startTransition(() => {
        router.replace(`${pathname}?${p.toString()}`, { scroll: false });
        router.refresh();
      });
    },
    [pathname, router, sp],
  );

  const onPick = useCallback(
    (row: PosCustomerSearchRow) => {
      if (!row.customerId) return;
      pushParams((p) => {
        p.set(POS_CUSTOMER_URL_KEYS.selectedId, row.customerId);
        p.set(POS_CUSTOMER_URL_KEYS.page, "1");
      });
    },
    [pushParams],
  );

  const onClearSelected = useCallback(() => {
    pushParams((p) => {
      p.delete(POS_CUSTOMER_URL_KEYS.selectedId);
    });
  }, [pushParams]);

  const invalidId = Boolean(customerIdParam && !customerIdValid);
  const detailError =
    !invalidId && customerIdParam && detailBundle && !detailBundle.success ? detailBundle.message : null;
  const customer = detailBundle?.success ? detailBundle.customer : null;
  const payments = detailBundle?.success ? detailBundle.payments : [];
  const quotas = detailBundle?.success ? detailBundle.quotas : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Clientes</h1>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">
          Búsqueda enlazada a la URL (como en cobros). Al elegir un cliente, la ficha y el historial se cargan en el
          servidor.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(280px,380px)_1fr] lg:items-stretch">
        <PosCustomerSearchPanel
          initial={initialCustomerSearch}
          selectedCustomer={selectedForSearch}
          onPick={onPick}
          onClearSelected={onClearSelected}
          heightVh={PANEL_VH}
          variant="split"
          showAddCustomer
          onAddCustomerClick={() => setCreateCustomerOpen(true)}
        />
        <PosCustomerDetailAside
          invalidId={invalidId}
          detailError={detailError}
          customer={customer}
          payments={payments}
          quotas={quotas}
        />
      </div>

      <PosCreateCustomerDialog
        open={createCustomerOpen}
        onClose={() => setCreateCustomerOpen(false)}
        onSuccess={(info) => {
          pushParams((p) => {
            p.set(POS_CUSTOMER_URL_KEYS.selectedId, info.customerId);
            p.set(POS_CUSTOMER_URL_KEYS.page, "1");
          });
        }}
      />
    </div>
  );
}
