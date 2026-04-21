'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import TopBar from '@/shared/components/TopBar/TopBar';
import { SideBarMenuItem } from '@/shared/components/TopBar/SideBar';
import ChangePasswordDialog from '@/shared/components/Dialog/ChangePasswordDialog';

export default function UIComponentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
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

  const user = session?.user as Record<string, unknown> | undefined;

  // Menu items structure
  const menuItems: SideBarMenuItem[] = [
    { label: 'Dashboard', url: '/dashboard' },
    {
      label: 'UI Components',
      children: [
        { label: 'Button', url: '/ui-components/button' },
        { label: 'Icon Button', url: '/ui-components/icon-button' },
        { label: 'Autocomplete', url: '/ui-components/autocomplete' },
        { label: 'Select', url: '/ui-components/select' },
        { label: 'Dialog', url: '/ui-components/dialog' },
        { label: 'Card', url: '/ui-components/card' },
      ],
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      <TopBar
        title="Flow Store Admin"
        logoSrc="/logo.png"
        menuItems={menuItems}
        onOpenChangePassword={() => setIsDialogOpen(true)}
      />
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
      <ChangePasswordDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
}
