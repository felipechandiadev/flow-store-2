'use client'
import React, { useState, useContext } from 'react';
import { useSession } from 'next-auth/react';
import { ImageOff, Image as ImageIcon } from 'lucide-react';
import IconButton from '@/shared/components/IconButton';
import SideBar, { SideBarMenuItem } from './SideBar';

export type { SideBarMenuItem };
// TODO: Implement NotificationBell and useNotificationsSocket when notifications feature is created
// import { NotificationBell } from '@/features/notifications/components/NotificationBell';
// import { useNotificationsSocket } from '@/features/notifications/hooks/useNotificationsSocket';
// TODO: Create UserProfileDropdown component
// import UserProfileDropdown from 'TopBar/UserProfileDropdown';

interface TopBarProps {
  /** Nombre de producto / marca (ej. FlowStore). */
  title: string;
  /** Línea secundaria bajo el título: tipografía más pequeña y color suave (ej. «Panel de administración»). */
  subtitle?: string;
  logoSrc: string;
  menuItems: SideBarMenuItem[];
  showUserButton?: boolean;
  userName?: string;            // login name, prefixed with @ when displayed
  firstName?: string;           // persona first name
  lastName?: string;            // persona last name
  onOpenChangePassword?: () => void;
}

interface SideBarControl {
  open: () => void;
  close: () => void;
  isOpen: boolean;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const SideBarContext = React.createContext<SideBarControl>({
  open: () => {},
  close: () => {},
  isOpen: false,
  expanded: {},
  setExpanded: () => {},
});

export function useSideBar() {
  return useContext(SideBarContext);
}

const TopBar: React.FC<TopBarProps & { className?: string }> = ({
  title,
  subtitle,
  logoSrc,
  menuItems = [],
  showUserButton = false,
  userName,
  firstName,
  lastName,
  onOpenChangePassword,
  className = ""
}) => {
  const { data: session } = useSession();
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState<Record<string, boolean>>({});
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Notificaciones WebSocket - TODO: Implement when notifications feature is ready
  // const {
  //   notifications,
  //   unreadCount,
  //   isConnected,
  //   markAsRead,
  //   markAllAsRead,
  // } = useNotificationsSocket();

  const open = () => setShowSidebar(true);
  const close = () => setShowSidebar(false);

  const fromProps = [firstName, lastName].filter(Boolean).join(' ').trim();
  const personName =
    fromProps
    || (typeof session?.user?.name === 'string' ? session.user.name.trim() : '')
    || '';

  return (
    <SideBarContext.Provider value={{ open, close, isOpen: showSidebar, expanded: sidebarExpanded, setExpanded: setSidebarExpanded }}>
        <div data-test-id="top-bar-root">
      <header className={`fixed top-0 z-30 w-full flex items-center justify-between px-10 py-2 pb-3 bg-background border-b border-border ${className}`}>
          <div className="flex items-center gap-3">
            {logoSrc ? (
              <>
                {(!logoLoaded || logoError) && (
                  <div className="h-10 w-10 bg-neutral-300 rounded-lg flex items-center justify-center" data-test-id="top-bar-logo-skeleton">
                    {logoError && (
                      <ImageOff className="text-neutral-400" size={20} />
                    )}
                  </div>
                )}
                {!logoError && (
                  <img
                    src={logoSrc}
                    alt="Logo"
                    className={`h-10 w-10 object-contain transition-opacity duration-300 ${!logoLoaded ? 'opacity-0' : 'opacity-100'}`}
                    data-test-id="top-bar-logo"
                    onLoad={() => setLogoLoaded(true)}
                    onError={() => setLogoError(true)}
                  />
                )}
              </>
            ) : (
              <div className="h-10 w-10 bg-neutral-300 rounded-lg flex items-center justify-center" data-test-id="top-bar-logo-placeholder">
                <ImageIcon className="text-neutral-400" size={20} />
              </div>
            )}
            {title && title.trim() && (
              <div
                className={
                  subtitle?.trim()
                    ? 'flex flex-col gap-0 leading-none'
                    : 'flex min-h-10 items-center'
                }
              >
                <span
                  className="block text-lg font-bold leading-tight tracking-tight text-foreground"
                  data-test-id="top-bar-title"
                >
                  {title}
                </span>
                {subtitle?.trim() ? (
                  <span
                    className="-mt-px block text-[11px] font-normal leading-tight text-muted sm:text-xs"
                    data-test-id="top-bar-subtitle"
                  >
                    {subtitle}
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* Right side: nombre de la persona a la izquierda del menú; sesión o props */}
          <div className="flex min-w-0 max-w-full items-center justify-end gap-2">
            {(personName || userName) && (
              <span
                className="min-w-0 max-w-[min(11rem,42vw)] truncate text-right text-sm font-medium text-foreground sm:max-w-xs md:max-w-sm"
                data-test-id="top-bar-user-name"
                title={
                  [personName, userName ? `@${userName}` : ''].filter(Boolean).join(' ').trim() || undefined
                }
              >
                {personName}
                {personName && userName ? (
                  <span className="font-normal text-muted">{' '}@{userName}</span>
                ) : !personName && userName ? (
                  <span>@{userName}</span>
                ) : null}
              </span>
            )}

            {/* Notification Bell - TODO: Implement when notifications feature is ready */}
            {/* <div className="mr-4">
              <NotificationBell
                unreadCount={unreadCount}
                isConnected={isConnected}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                notifications={notifications}
              />
            </div> */}

            {/* User Profile Dropdown */}
            {showUserButton && (
              <>
                {/* TODO: Uncomment when UserProfileDropdown component is created */}
                {/* <UserProfileDropdown /> */}
              </>
            )}

            <IconButton
              icon="Menu"
              variant="basicSecondary"
              size="md"
              strokeWidth={2.5}
              onClick={open}
              ariaLabel="Abrir menú"
              data-test-id="top-bar-menu-button"
            />
          </div>
        </header>
        {showSidebar && (
          <div
            className="fixed inset-0 z-40 flex"
            data-test-id="sidebar-shell"
            role="presentation"
          >
            <SideBar
              menuItems={menuItems}
              onClose={close}
              logoUrl={logoSrc}
              expandedState={sidebarExpanded}
              onExpandedChange={setSidebarExpanded}
              onOpenChangePassword={onOpenChangePassword}
            />
            <div
              className="min-h-0 min-w-0 flex-1 cursor-default bg-black/10"
              aria-label="Cerrar menú lateral"
              data-test-id="sidebar-overlay"
              onClick={close}
            />
          </div>
        )}
        {/* Children se renderizan fuera de TopBar, en el layout */}
      </div>
    </SideBarContext.Provider>
  );
};

export default TopBar;
