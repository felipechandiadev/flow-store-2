'use client'
import React, { useState, useContext, useTransition } from 'react';
import Image from 'next/image';
import { Menu, ImageOff, Image as ImageIcon } from 'lucide-react';
import SideBar, { SideBarMenuItem } from './SideBar';

export type { SideBarMenuItem };
// TODO: Implement NotificationBell and useNotificationsSocket when notifications feature is created
// import { NotificationBell } from '@/features/notifications/components/NotificationBell';
// import { useNotificationsSocket } from '@/features/notifications/hooks/useNotificationsSocket';
// TODO: Create UserProfileDropdown component
// import UserProfileDropdown from 'TopBar/UserProfileDropdown';

interface TopBarProps {
  title: string;
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
  logoSrc,
  menuItems = [],
  showUserButton = false,
  userName,
  firstName,
  lastName,
  onOpenChangePassword,
  className = ""
}) => {
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

  return (
    <SideBarContext.Provider value={{ open, close, isOpen: showSidebar, expanded: sidebarExpanded, setExpanded: setSidebarExpanded }}>
        <div data-test-id="top-bar-root">
      <header className={`fixed top-0 z-30 w-full flex items-center justify-between px-10 py-2 pb-3 bg-background border-b-2 border-primary ${className}`}>
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
                  <Image
                    src={logoSrc}
                    alt="Logo"
                    width={40}
                    height={40}
                    className={`h-10 w-10 object-contain transition-opacity duration-300 ${!logoLoaded ? 'opacity-0 absolute' : 'opacity-100'}`}
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
              <span className="text-lg font-bold text-foreground" data-test-id="top-bar-title">{title}</span>
            )}
          </div>

          {/* Right side elements */}
          <div className="flex items-center gap-2">
            {/* Display persona name + username before menu button */}
            {(firstName || lastName || userName) && (
              <span className="text-sm font-normal text-foreground" data-test-id="top-bar-user-name">
                {firstName || ''} {lastName || ''}{userName ? ` @${userName}` : ''}
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

            {/* Menu button */}
            <button
              type="button"
              onClick={open}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors text-foreground hover:text-secondary focus:outline-none"
              data-test-id="top-bar-menu-button"
              aria-label="Abrir menú"
            >
              <Menu size={24} aria-hidden />
            </button>
          </div>
        </header>
        {/* Renderizar SideBar como modal, solo si showSidebar está activo */}
        {showSidebar && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/10"
              onClick={close}
              aria-label="Cerrar menú lateral"
              data-test-id="sidebar-overlay"
            />
            <SideBar
              menuItems={menuItems}
              onClose={close}
              logoUrl={logoSrc}
              expandedState={sidebarExpanded}
              onExpandedChange={setSidebarExpanded}
              onOpenChangePassword={onOpenChangePassword}
            />
          </>
        )}
        {/* Children se renderizan fuera de TopBar, en el layout */}
      </div>
    </SideBarContext.Provider>
  );
};

export default TopBar;
