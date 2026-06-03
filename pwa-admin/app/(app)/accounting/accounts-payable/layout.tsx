import type { ReactNode } from "react";
import { TabPageLayout } from "@/shared/components/layouts";
import { adminFillViewportBelowTopBarClassName } from "@/shared/components/layouts/layoutPageTokens";
import { AccountsPayableTabs } from "./AccountsPayableTabs";

export default function AccountsPayableLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Cuentas por pagar"
      subtitle="Obligaciones de pago pendientes: compras, remuneraciones y gastos operativos."
      tabs={<AccountsPayableTabs />}
      className={`min-h-0 ${adminFillViewportBelowTopBarClassName}`}
      contentClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      compact
      data-test-id="accounting-accounts-payable-layout"
    >
      {children}
    </TabPageLayout>
  );
}
