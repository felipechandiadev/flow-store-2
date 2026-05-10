'use client'
import React, { useState, useContext } from 'react';
import { useSession } from 'next-auth/react';
import { ImageOff, Image as ImageIcon } from 'lucide-react';
import IconButton from '@/shared/components/IconButton';
import { useImageWithPlaceholder } from '@/shared/hooks/useImageWithPlaceholder';
import CompanySwitcher from '@/features/companies/components/CompanySwitcher';
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
  /** Nombre de fantasía: a la derecha del nombre de usuario, separado por un punto (color secondary). */
  companyTradeName?: string | null;
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
  companyTradeName,
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
  const {
    ref: logoImgRef,
    loaded: logoLoaded,
    error: logoError,
    onLoad: onLogoLoad,
    onError: onLogoError,
  } = useImageWithPlaceholder(logoSrc);

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
              <div
                className="relative h-10 w-10 shrink-0"
                data-test-id="top-bar-logo-box"
              >
                {(!logoLoaded || logoError) && (
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-lg bg-neutral-300"
                    data-test-id="top-bar-logo-skeleton"
                    aria-hidden
                  >
                    {logoError && (
                      <ImageOff className="text-neutral-400" size={20} />
                    )}
                  </div>
                )}
                {!logoError && (
                  <img
                    ref={logoImgRef}
                    src={logoSrc}
                    alt="Logo"
                    className="relative h-10 w-10 object-contain transition-opacity duration-300"
                    style={{ opacity: logoLoaded ? 1 : 0 }}
                    data-test-id="top-bar-logo"
                    onLoad={onLogoLoad}
                    onError={onLogoError}
                  />
                )}
              </div>
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

          {/* Derecha: usuario, separador (círculo secondary), nombre de fantasía, menú */}
          <div className="flex min-w-0 max-w-full items-center justify-end gap-2">
            <div className="flex min-w-0 max-w-full items-center justify-end gap-2 sm:gap-2.5">
              {(personName || userName) && (
                <span
                  className="min-w-0 max-w-[min(10rem,36vw)] truncate text-right text-sm font-medium text-foreground sm:max-w-[12rem] md:max-w-xs"
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
              {(personName || userName) ? (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-secondary)]"
                  aria-hidden
                />
              ) : null}
              <CompanySwitcher />
            </div>

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
