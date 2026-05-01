"use client";

import Tabs from "@/shared/components/Tabs";

export const TAB_INVOICE_LIST = "list";
export const TAB_INVOICE_NEW = "new";

export function InvoicesTabs() {
  return (
    <Tabs
      items={[
        { label: "Listado", url: "/purchasing/invoices/list" },
        { label: "Nueva", url: "/purchasing/invoices/new" },
      ]}
    />
  );
}

