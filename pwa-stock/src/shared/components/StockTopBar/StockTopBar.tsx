"use client";

import { signOut } from "next-auth/react";
import { IconButton } from "@/shared";

export default function StockTopBar() {
  return (
    <header
      className="fixed top-0 z-30 w-full border-b"
      style={{
        backgroundColor: "var(--color-background)",
        borderColor: "var(--color-border)",
      }}
      data-test-id="stock-top-bar"
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img src="/logo.png" alt="KaiStore" className="h-9 w-9 shrink-0 object-contain" />
          <div className="flex min-w-0 flex-col leading-none">
            <span className="text-base font-bold tracking-tight">KaiStore</span>
            <span className="text-xs font-normal text-muted-foreground">StockControl</span>
          </div>
        </div>
        <IconButton
          variant="basicSecondary"
          size="sm"
          ariaLabel="Cerrar sesión"
          icon="LogOut"
          onClick={() => signOut({ callbackUrl: "/" })}
          data-test-id="stock-logout"
        />
      </div>
    </header>
  );
}
