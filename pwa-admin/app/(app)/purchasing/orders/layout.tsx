import type { ReactNode } from "react";
import { TabPageLayout } from "@/shared/components/layouts";
import { OrdersTabs } from "./OrdersTabs";

export default function PurchaseOrdersLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Órdenes de compra"
      tabs={<OrdersTabs />}
      className="min-h-0"
      data-test-id="purchasing-orders-layout"
    >
      {children}
    </TabPageLayout>
  );
}
