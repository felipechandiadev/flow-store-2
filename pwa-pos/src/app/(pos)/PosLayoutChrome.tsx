"use client";

import { usePathname } from "next/navigation";
import PosCartProvider from "@/features/pos-cart/PosCartProvider";

type Props = {
  children: React.ReactNode;
  topBar: React.ReactNode;
};

/** Resultado del arqueo: pantalla aislada sin TopBar (tras cerrar la caja). */
function isCashClosingResultPath(pathname: string | null): boolean {
  return pathname === "/cash/closing/result";
}

export default function PosLayoutChrome({ children, topBar }: Props) {
  const pathname = usePathname();
  const resultOnly = isCashClosingResultPath(pathname);

  if (resultOnly) {
    return (
      <div className="flex h-screen overflow-hidden flex-col bg-background">
        <main className="flex flex-1 flex-col overflow-auto">
          <PosCartProvider>{children}</PosCartProvider>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      {topBar}
      <main className="mt-(--app-topbar-height) flex-1 overflow-auto bg-background px-6 pt-4 pb-6 md:px-10">
        <PosCartProvider>{children}</PosCartProvider>
      </main>
    </div>
  );
}
