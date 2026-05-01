import type { ReactNode } from "react";
import { TabPageLayout } from "@/shared/components/layouts";
import { TransactionFlowsTabs } from "./ui/TransactionFlowsTabs";

export default function AccountingFlowsLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Flujos de transacciones"
      subtitle="Visualiza cómo una transacción dispara efectos y transacciones derivadas."
      tabs={<TransactionFlowsTabs />}
      className="min-h-0"
      data-test-id="accounting-flows-layout"
    >
      {children}
    </TabPageLayout>
  );
}

