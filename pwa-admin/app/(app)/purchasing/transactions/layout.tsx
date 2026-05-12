import type { ReactNode } from "react";
import { TabPageLayout } from "@/shared/components/layouts";
import { PurchasingTransactionsTabs } from "./ui/PurchasingTransactionsTabs";

export default function PurchasingTransactionsLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      tabs={<PurchasingTransactionsTabs />}
      className="min-h-0"
      data-test-id="purchasing-transactions-layout"
    >
      {children}
    </TabPageLayout>
  );
}
