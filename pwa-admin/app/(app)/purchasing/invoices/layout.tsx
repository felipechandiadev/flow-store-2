import type { ReactNode } from "react";
import { TabPageLayout } from "@/shared/components/layouts";
import { InvoicesTabs } from "./InvoicesTabs";

export default function SupplierInvoicesLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Facturas de proveedor"
      subtitle="Factura (CxP) separada de la Recepción (logística)."
      tabs={<InvoicesTabs />}
      className="min-h-0"
      data-test-id="purchasing-invoices-layout"
    >
      {children}
    </TabPageLayout>
  );
}

