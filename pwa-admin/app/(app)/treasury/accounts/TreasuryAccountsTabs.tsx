"use client";

import Tabs from "@/shared/components/Tabs";

export function TreasuryAccountsTabs() {
  const items = [
    { label: "Cuentas bancarias", url: "/treasury/accounts/bank" },
    { label: "Cajas", url: "/treasury/accounts/cash" },
  ];
  return <Tabs items={items} />;
}
