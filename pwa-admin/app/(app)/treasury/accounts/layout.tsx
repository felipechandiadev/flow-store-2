import type { ReactNode } from "react";
import { TabPageLayout } from "@/shared/components/layouts";
import { TreasuryAccountsTabs } from "./TreasuryAccountsTabs";

export default function TreasuryAccountsLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      compact
      tabs={<TreasuryAccountsTabs />}
      className="min-h-0"
      headerClassName="pt-0"
      data-test-id="treasury-accounts-layout"
    >
      {children}
    </TabPageLayout>
  );
}
