"use client";

import { signOut } from "next-auth/react";
import { IconButton } from "@/shared";
import StockPageShell from "@/shared/components/StockPageShell/StockPageShell";

export default function StockAuthenticatedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StockPageShell
      headerEnd={
        <IconButton
          variant="basicSecondary"
          size="sm"
          ariaLabel="Cerrar sesión"
          icon="LogOut"
          onClick={() => signOut({ callbackUrl: "/" })}
          data-test-id="stock-logout"
        />
      }
    >
      {children}
    </StockPageShell>
  );
}
