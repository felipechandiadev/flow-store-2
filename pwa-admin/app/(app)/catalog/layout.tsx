import type { ReactNode } from "react";
import { TabPageLayout } from "@/shared/components/layouts";
import { CatalogTabs } from "./ui/CatalogTabs";
import { CatalogLayoutTitle } from "./ui/CatalogLayoutTitle";

export default function CatalogLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title={<CatalogLayoutTitle />}
      subtitle="Catálogo"
      tabs={<CatalogTabs />}
      className="min-h-0"
      data-test-id="catalog-layout"
    >
      {children}
    </TabPageLayout>
  );
}
