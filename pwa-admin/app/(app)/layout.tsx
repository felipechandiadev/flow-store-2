'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import TopBar from '@/shared/components/TopBar/TopBar';
import ChangePasswordDialog from '@/shared/components/Dialog/ChangePasswordDialog';
import { mainMenuItems } from '@/navigation/mainMenu';

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      <TopBar
        title="FlowStore"
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
