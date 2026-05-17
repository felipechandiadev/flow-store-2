import type { ReactNode } from "react";

type StockPageShellProps = {
  children: ReactNode;
  headerEnd?: ReactNode;
};

export default function StockPageShell({ children, headerEnd }: StockPageShellProps) {
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
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <img src="/logo.png" alt="KaiStore" className="h-9 w-9 shrink-0 object-contain" />
            <div className="flex min-w-0 flex-col leading-none">
              <span className="text-base font-bold tracking-tight">KaiStore</span>
              <span className="text-xs font-normal text-muted-foreground">StockControl</span>
            </div>
          </div>
          {headerEnd ? <div className="shrink-0">{headerEnd}</div> : null}
        </div>
      </header>
      <main
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6"
        style={{ paddingTop: "calc(var(--app-topbar-height) + 1rem)" }}
      >
        {children}
      </main>
    </div>
  );
}

