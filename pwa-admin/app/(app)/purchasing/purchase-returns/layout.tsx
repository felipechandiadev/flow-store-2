import type { ReactNode } from "react";
import { TabPageLayout } from "@/shared/components/layouts";
import { PurchaseReturnsTabs } from "./PurchaseReturnsTabs";

export default function PurchaseReturnsLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Devoluciones proveedor"
      subtitle="Transacción `PURCHASE_RETURN`: salida de stock y reverso operativo; base para notas de crédito proveedor."
      tabs={<PurchaseReturnsTabs />}
      className="min-h-0"
      data-test-id="purchasing-purchase-returns-layout"
    >
      {children}
    </TabPageLayout>
  );
}
