"use client";

import { useState, type ReactNode } from "react";
import { IconButton } from "@/shared";
import SideBar from "@/shared/components/SideBar/SideBar";
import { stockMenuItems } from "@/navigation/stockMenu";

function StockBrandBlock() {
  return (
    <div className="flex shrink-0 items-center gap-2" data-test-id="stock-top-bar-brand">
      <div className="flex flex-col text-right leading-none">
        <span className="text-base font-bold tracking-tight">KaiStore</span>
        <span className="text-xs font-normal text-muted-foreground">StockControl</span>
      </div>
      <img
        src="/logo.png"
        alt=""
        className="h-9 w-9 shrink-0 object-contain"
        data-test-id="stock-top-bar-logo"
      />
    </div>
  );
}

type StockPageShellProps = {
  children: ReactNode;
};

export default function StockPageShell({ children }: StockPageShellProps) {
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState<Record<string, boolean>>({});

  const openSidebar = () => setShowSidebar(true);
  const closeSidebar = () => setShowSidebar(false);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header
        className="fixed top-0 z-30 w-full border-b"
        style={{
          backgroundColor: "var(--color-background)",
          borderColor: "var(--color-border)",
        }}
        data-test-id="stock-app-header"
      >
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-2">
          <IconButton
            icon="Menu"
            variant="basicSecondary"
            size="md"
            strokeWidth={2.5}
            onClick={openSidebar}
            ariaLabel="Abrir menú"
            data-test-id="stock-menu-button"
          />
          <StockBrandBlock />
        </div>
      </header>

      {showSidebar ? (
        <div
          className="fixed inset-0 z-[60] flex"
          data-test-id="stock-sidebar-shell"
          role="presentation"
        >
          <SideBar
            menuItems={stockMenuItems}
            onClose={closeSidebar}
            logoUrl="/logo.png"
            expandedState={sidebarExpanded}
            onExpandedChange={setSidebarExpanded}
          />
          <div
            className="min-h-0 min-w-0 flex-1 cursor-default bg-black/10"
            aria-label="Cerrar menú lateral"
            data-test-id="stock-sidebar-overlay"
            onClick={closeSidebar}
          />
        </div>
      ) : null}

      <main
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6"
        style={{ paddingTop: "calc(var(--app-topbar-height) + 1rem)" }}
      >
        {children}
      </main>
    </div>
  );
}
