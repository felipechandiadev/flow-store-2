import type { ReactNode } from "react";
import { TabPageLayout } from "@/shared/components/layouts";
import { ReceptionsTabs } from "./ReceptionsTabs";

export default function ReceptionsLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Recepciones de compra"
      tabs={<ReceptionsTabs />}
      className="min-h-0"
      data-test-id="purchasing-receptions-layout"
    >
      {children}
    </TabPageLayout>
  );
}
