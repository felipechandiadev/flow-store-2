import type { ReactNode } from "react";
import { TabPageLayout } from "@/shared/components/layouts";
import { SalesTransactionsTabs } from "./ui/SalesTransactionsTabs";

export default function SalesTransactionsLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      tabs={<SalesTransactionsTabs />}
      className="min-h-0"
      data-test-id="sales-transactions-layout"
    >
      {children}
    </TabPageLayout>
  );
}
