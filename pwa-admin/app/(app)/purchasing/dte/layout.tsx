import type { ReactNode } from "react";
import { TabPageLayout } from "@/shared/components/layouts";
import { DteMainTabs } from "./DteMainTabs";

export default function DteProveedorLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="DTE proveedor"
      subtitle="Documentos tributarios electrónicos del proveedor: facturas, boletas y notas de crédito."
      tabs={<DteMainTabs />}
      className="min-h-0"
      data-test-id="purchasing-dte-layout"
    >
      {children}
    </TabPageLayout>
  );
}
