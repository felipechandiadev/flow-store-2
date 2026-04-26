"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import TopBar from "@/shared/components/TopBar/TopBar";
import ChangePasswordDialog from "@/shared/components/Dialog/ChangePasswordDialog";
import { mainMenuItems } from "@/navigation/mainMenu";
import { useCompany } from "@/providers/CompanyProvider";

export default function AppShellLayoutClient({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { company } = useCompany();

  const companyTradeName =
    company?.nombreFantasia != null && String(company.nombreFantasia).trim() !== ""
      ? String(company.nombreFantasia).trim()
      : null;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      <TopBar
        title="FlowStore"
        companyTradeName={companyTradeName}
        subtitle="Panel de administración"
        logoSrc="/logo.png"
        menuItems={mainMenuItems}
        onOpenChangePassword={() => setIsDialogOpen(true)}
      />
      <main className="flex-1 overflow-auto bg-background px-6 pb-6 pt-[calc(var(--app-topbar-height)+1rem)] md:px-10">
        {children}
      </main>
      <ChangePasswordDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
}
