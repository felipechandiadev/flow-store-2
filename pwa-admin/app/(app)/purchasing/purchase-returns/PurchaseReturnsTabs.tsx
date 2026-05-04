"use client";

import Tabs from "@/shared/components/Tabs";

export function PurchaseReturnsTabs() {
  return (
    <Tabs
      items={[
        { label: "Listado", url: "/purchasing/purchase-returns/list" },
        { label: "Nueva", url: "/purchasing/purchase-returns/new" },
      ]}
    />
  );
}
