"use client";

import Tabs from "@/shared/components/Tabs";

export function DteMainTabs() {
  return (
    <Tabs
      items={[
        { label: "Facturas", url: "/purchasing/dte/invoices" },
        { label: "Boletas", url: "/purchasing/dte/receipts" },
        { label: "Guías de despacho", url: "/purchasing/dte/guides" },
        { label: "Notas de crédito", url: "/purchasing/dte/credit-notes" },
      ]}
    />
  );
}
