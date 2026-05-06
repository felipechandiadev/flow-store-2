import PosTopBarServer from "@/shared/components/PosTopBar/PosTopBarServer";
import PosCartProvider from "@/features/pos-cart/PosCartProvider";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden flex-col">
      <PosTopBarServer />

      <main className="flex-1 overflow-auto bg-background px-6 pb-6 mt-(--app-topbar-height) pt-4 md:px-10">
        <PosCartProvider>{children}</PosCartProvider>
      </main>
    </div>
  );
}

