"use client";

import { usePathname } from "next/navigation";
import Tabs from "@/shared/components/Tabs";

const BASE = "/sales/transactions";

const items = [
  { url: `${BASE}/sales`, label: "Ventas" },
  { url: `${BASE}/customer-returns`, label: "Devoluciones cliente" },
  { url: `${BASE}/quotations`, label: "Cotizaciones" },
  { url: `${BASE}/payments`, label: "Pagos recibidos" },
];

export function SalesTransactionsTabs() {
  const pathname = usePathname();
  const activeTab =
    items.find((tab) => pathname === tab.url || pathname.startsWith(`${tab.url}/`))?.url ??
    `${BASE}/sales`;
  return <Tabs items={items} activeTab={activeTab} />;
}
