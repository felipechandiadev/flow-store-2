"use client";

import { usePathname } from "next/navigation";
import Tabs from "@/shared/components/Tabs";

const TAB_LIST = "/purchasing/receptions/list";
const TAB_NEW = "/purchasing/receptions/new";

const items = [
  { url: TAB_LIST, label: "Listado" },
  { url: TAB_NEW, label: "Nueva recepción" },
];

export function ReceptionsTabs() {
  const pathname = usePathname();
  const activeTab =
    pathname === TAB_NEW || pathname.startsWith(`${TAB_NEW}/`) ? TAB_NEW : TAB_LIST;

  return <Tabs items={items} activeTab={activeTab} />;
}
