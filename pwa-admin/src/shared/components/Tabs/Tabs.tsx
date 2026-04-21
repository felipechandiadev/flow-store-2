"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface TabItem {
  url: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeTab?: string;
}

const Tabs: React.FC<TabsProps> = ({ items, activeTab }) => {
  const pathname = usePathname();

  // Determine active tab: use provided activeTab prop, or match by pathname
  const getIsActive = (tabUrl: string) => {
    if (activeTab) {
      return tabUrl === activeTab;
    }
    // Match by any part of the URL path
    return pathname.includes(tabUrl.split('/').filter(Boolean).pop() || '');
  };

  return (
    <nav className="flex" data-test-id="tabs-root">
      {items.map((tab) => {
        const isActive = getIsActive(tab.url);

        return (
          <Link
            key={tab.url}
            href={tab.url}
            className={`inline-flex items-center border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-neutral-600 hover:border-gray-300 hover:text-foreground"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default Tabs;
