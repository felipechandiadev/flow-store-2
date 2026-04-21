'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import TopBar, { type SideBarMenuItem } from '@/shared/components/TopBar/TopBar';
import ChangePasswordDialog from '@/shared/components/Dialog/ChangePasswordDialog';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    router.push('/');
    return null;
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const user = session?.user as Record<string, unknown> | undefined;

  // Menu items structure
  const menuItems: SideBarMenuItem[] = [
    { label: 'Dashboard', url: '/dashboard' },
    {
      label: 'Gestión',
      children: [
        { label: 'Productos', url: '/dashboard/productos' },
        { label: 'Inventario', url: '/dashboard/inventario' },
        { label: 'Clientes', url: '/dashboard/clientes' },
        { label: 'Proveedores', url: '/dashboard/proveedores' },
      ],
    },
    {
      label: 'Operaciones',
      children: [
        { label: 'Ventas', url: '/dashboard/ventas' },
        { label: 'Compras', url: '/dashboard/compras' },
      ],
    },
    {
      label: 'Configuración',
      children: [
        { label: 'Usuarios', url: '/dashboard/usuarios' },
        { label: 'Reportes', url: '/dashboard/reportes' },
      ],
    },
  ];

  return (
    <>
      <TopBar
        title="Flow Store Admin"
        logoSrc="/logo.svg"
        menuItems={menuItems}
        showUserButton={true}
        userName={user?.userName as string | undefined}
        firstName={user?.firstName as string | undefined}
        lastName={user?.lastName as string | undefined}
        onOpenChangePassword={() => setShowChangePassword(true)}
      />
      <main className="pt-24 px-6 pb-6">
        {children}
      </main>
      <ChangePasswordDialog
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  );
}
