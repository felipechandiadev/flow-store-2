import type { ReactNode } from "react";
import { CatalogTabPageLayout } from "./ui/CatalogTabPageLayout";

export default function CatalogLayout({ children }: { children: ReactNode }) {
  return <CatalogTabPageLayout>{children}</CatalogTabPageLayout>;
}
