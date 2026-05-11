"use client";

import Tabs from "@/shared/components/Tabs";

export function SettingsCompaniesTabs() {
  const items = [
    { label: "Empresas", url: "/settings/companies" },
    { label: "Administradores globales", url: "/settings/companies/super-admins" },
  ];
  return <Tabs items={items} />;
}
