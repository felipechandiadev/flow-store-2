"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Building2, ImageOff, Image as ImageIcon, Store, User, Wifi, WifiOff } from "lucide-react";
import IconButton from "@/shared/components/IconButton/IconButton";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { StockAlertsDropdown } from "@/features/inventory-stock/ui/StockAlertsDropdown";
import { PrintServiceTopBarDropdown, usePrintServiceConnection } from "@flowstore/print-service-client";
import {
  clearPosPrintJobBrowserFallback,
  tryPosPrintJobBrowserFallback,
} from "@/features/pos-print/lib/pos-print-job-browser-fallback";

export type PosTopBarProps = {
  pointOfSaleName?: string | null;
  companyTradeName?: string | null;
  personName?: string | null;
  userRole?: string | null;
};

function roleLabel(role: string): string {
  const r = role.trim().toUpperCase();
  if (r === "ADMIN") return "Administrador";
  if (r === "MANAGER") return "Administrador";
  if (r === "CASHIER") return "Cajero";
  if (r === "SELLER") return "Vendedor";
  return role.trim();
}

type TopBarNavIconVariant = "text" | "basicSecondary";

/** Primary por defecto; secondary cuando la ruta coincide (sección activa). */
function topBarNavIconVariant(active: boolean): TopBarNavIconVariant {
  return active ? "basicSecondary" : "text";
}

function pathnameMatchesRoute(pathname: string, routePrefix: string): boolean {
  const p = pathname.trim() || "/";
  if (routePrefix === "/pos") {
    return p === "/pos" || p.startsWith("/pos/payment") || p.startsWith("/pos/credit-payment");
  }
  return p === routePrefix || p.startsWith(`${routePrefix}/`);
}

export default function PosTopBar({
  pointOfSaleName = null,
  companyTradeName = null,
  personName = null,
  userRole = null,
}: PosTopBarProps) {
  const [posNameFromClient, setPosNameFromClient] = useState<string | null>(null);
  useEffect(() => {
    const parsed = readPosContextClient();
    if (!parsed) return;
    const pn = typeof parsed.pointOfSaleName === "string" ? parsed.pointOfSaleName.trim() : "";
    const bn = typeof parsed.branchName === "string" ? parsed.branchName.trim() : "";
    const label = [pn, bn].filter(Boolean).join(" — ").trim();
    if (label) setPosNameFromClient(label);
  }, []);

  const effectivePosName = (pointOfSaleName?.trim() ? pointOfSaleName.trim() : "") || posNameFromClient || "";
  const effectiveCompany = companyTradeName?.trim() ? companyTradeName.trim() : "";
  const effectivePerson = personName?.trim() ? personName.trim() : "";
  const effectiveRole = userRole?.trim() ? roleLabel(userRole) : "";
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const title = "KaiStore";
  const subtitle = "POS";
  const logoSrc = "/logo.png";

  const printServiceDebug =
    process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_PRINT_SERVICE_DEBUG === "1";

  const onPrintJobFailed = useCallback((jobId: string, error: string) => {
    return tryPosPrintJobBrowserFallback(jobId, error);
  }, []);

  const onPrintJobDone = useCallback((jobId: string) => {
    clearPosPrintJobBrowserFallback(jobId);
  }, []);

  const printService = usePrintServiceConnection({
    clientId: "pwa-pos",
    requiredPurposes: ["tickets", "documents"],
    appLabel: "KaiStore POS",
    userDisplayName: effectivePerson || undefined,
    companyName: effectiveCompany || undefined,
    pointOfSaleName: effectivePosName || undefined,
    debug: printServiceDebug,
    enableInAppNotifications: true,
    briefWsErrorMessages: true,
    onPrintJobFailed,
    onPrintJobDone,
  });

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoLoaded(false);
    setLogoError(false);
  }, [logoSrc]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setLogoLoaded(true);
    }
  }, []);

  const showContextColumn = Boolean(effectiveCompany || effectivePosName);
  const showUserColumn = Boolean(effectivePerson || effectiveRole);

  return (
    <header
      className="fixed top-0 z-30 w-full border-b"
      style={{
        backgroundColor: "var(--color-background)",
        borderColor: "var(--color-border)",
      }}
      data-test-id="top-bar-root"
    >
      <div className="flex items-center justify-between gap-6 px-10 py-2 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {logoSrc ? (
            <div
              className="relative h-10 w-10 shrink-0"
              data-test-id="top-bar-logo-box"
              suppressHydrationWarning
            >
              {(!logoLoaded || logoError) && (
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg bg-neutral-300"
                  data-test-id="top-bar-logo-skeleton"
                  aria-hidden
                  suppressHydrationWarning
                >
                  {logoError ? <ImageOff className="text-neutral-400" size={20} /> : null}
                </div>
              )}
              {!logoError ? (
                <img
                  ref={imgRef}
                  src={logoSrc}
                  alt="Logo"
                  className="relative h-10 w-10 object-contain transition-opacity duration-300"
                  style={{ opacity: logoLoaded ? 1 : 0 }}
                  data-test-id="top-bar-logo"
                  onLoad={() => setLogoLoaded(true)}
                  onError={() => setLogoError(true)}
                  suppressHydrationWarning
                />
              ) : null}
            </div>
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-300"
              data-test-id="top-bar-logo-placeholder"
              aria-hidden
            >
              <ImageIcon className="text-neutral-400" size={20} />
            </div>
          )}

          <div className="flex min-w-0 flex-1 items-center gap-6 lg:gap-10">
            {/* Misma jerarquía tipográfica que antes: título + subtítulo */}
            <div className={subtitle.trim() ? "flex min-w-0 shrink-0 flex-col gap-0 leading-none" : "flex min-h-10 min-w-0 shrink-0 items-center"}>
              <span
                className="block text-lg font-bold leading-tight tracking-tight"
                style={{ color: "var(--color-foreground)" }}
                data-test-id="top-bar-title"
              >
                {title}
              </span>
              {subtitle.trim() ? (
                <span
                  className="-mt-px block text-[11px] font-normal leading-tight sm:text-xs"
                  style={{ color: "var(--color-foreground)" }}
                  data-test-id="top-bar-subtitle"
                >
                  {subtitle}
                </span>
              ) : null}
            </div>

            {/* A la derecha del bloque KaiStore / Punto de venta: empresa/PV + usuario/rol.
                Los cuatro elementos comparten exactamente la misma tipografía y
                tamaño de ícono (estilo "detalle" del rol y PV); la jerarquía
                visual entre "ancla" (empresa / persona) y "subtítulo" (PV /
                rol) se preserva sólo a través del color. */}
            {showContextColumn || showUserColumn ? (
              <div className="flex min-w-0 items-center gap-6" data-test-id="pos-topbar-right-columns">
                {showContextColumn ? (
                  <div
                    className="flex min-w-0 flex-col gap-0 py-0.5 leading-none"
                    data-test-id="pos-topbar-context"
                    suppressHydrationWarning
                  >
                    {effectiveCompany ? (
                      <span
                        className="flex min-w-0 items-center gap-1.5 text-[11px] font-normal leading-tight sm:text-xs"
                        style={{ color: "var(--color-foreground)" }}
                        data-test-id="pos-topbar-company-trade-name"
                        title={effectiveCompany}
                      >
                        <Building2
                          size={14}
                          className="shrink-0 text-muted"
                          aria-hidden
                          data-test-id="pos-topbar-company-icon"
                        />
                        <span className="min-w-0 truncate">{effectiveCompany}</span>
                      </span>
                    ) : null}
                    {effectivePosName ? (
                      <span
                        className="flex min-w-0 items-center gap-1.5 text-[11px] font-normal leading-tight sm:text-xs"
                        style={{ color: "var(--color-foreground)" }}
                        data-test-id="pos-topbar-pos-name"
                        title={effectivePosName}
                      >
                        <Store
                          size={14}
                          className="shrink-0 text-muted"
                          aria-hidden
                          data-test-id="pos-topbar-store-icon"
                        />
                        <span className="min-w-0 truncate">{effectivePosName}</span>
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {showUserColumn ? (
                  <div
                    className="flex min-w-0 flex-col gap-0 py-0.5 leading-none"
                    data-test-id="pos-topbar-user"
                  >
                    {effectivePerson ? (
                      <span
                        className="flex min-w-0 items-center gap-1.5 text-[11px] font-normal leading-tight sm:text-xs"
                        style={{ color: "var(--color-foreground)" }}
                        data-test-id="pos-topbar-person-name"
                        title={effectivePerson}
                      >
                        <User
                          size={14}
                          className="shrink-0 text-muted"
                          aria-hidden
                          data-test-id="pos-topbar-user-icon"
                        />
                        <span className="min-w-0 truncate">{effectivePerson}</span>
                      </span>
                    ) : null}
                    {effectiveRole ? (
                      <span
                        className="flex min-w-0 items-center gap-1.5 text-[11px] font-normal leading-tight sm:text-xs"
                        style={{ color: "var(--color-foreground)" }}
                        data-test-id="pos-topbar-user-role"
                        title={effectiveRole}
                      >
                        <BadgeCheck
                          size={14}
                          className="shrink-0 text-muted"
                          aria-hidden
                          data-test-id="pos-topbar-user-role-icon"
                        />
                        <span className="min-w-0 truncate">{effectiveRole}</span>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <nav className="flex items-center gap-2">
            <IconButton
              icon="ShoppingCart"
              variant={topBarNavIconVariant(pathnameMatchesRoute(pathname, "/pos"))}
              size="md"
              ariaLabel="Ir al punto de venta"
              title="Punto de venta"
              aria-current={pathnameMatchesRoute(pathname, "/pos") ? "page" : undefined}
              onClick={() => router.push("/pos")}
              data-test-id="pos-topbar-pos"
            />
            <IconButton
              icon="Users"
              variant={topBarNavIconVariant(pathnameMatchesRoute(pathname, "/customers"))}
              size="md"
              ariaLabel="Clientes"
              aria-current={pathnameMatchesRoute(pathname, "/customers") ? "page" : undefined}
              onClick={() => router.push("/customers")}
              data-test-id="pos-topbar-customers"
            />
            <StockAlertsDropdown />
            <IconButton
              icon="FileCheck"
              variant={topBarNavIconVariant(
                pathnameMatchesRoute(pathname, "/purchasing/receptions"),
              )}
              size="md"
              ariaLabel="Recepción de compra"
              title="Recepción de compra"
              aria-current={
                pathnameMatchesRoute(pathname, "/purchasing/receptions") ? "page" : undefined
              }
              onClick={() => router.push("/purchasing/receptions/new")}
              data-test-id="pos-topbar-reception"
            />
            <IconButton
              icon="ArrowLeftRight"
              variant={topBarNavIconVariant(pathnameMatchesRoute(pathname, "/cash/movements"))}
              size="md"
              ariaLabel="Movimientos de caja"
              title="Movimientos de caja"
              aria-current={pathnameMatchesRoute(pathname, "/cash/movements") ? "page" : undefined}
              onClick={() => router.push("/cash/movements")}
              data-test-id="pos-topbar-cash-movements"
            />
            <IconButton
              icon="BanknoteArrowDown"
              variant={topBarNavIconVariant(pathnameMatchesRoute(pathname, "/cash/hub-deposit"))}
              size="md"
              ariaLabel="Ingreso de efectivo desde centro de efectivo"
              title="Ingreso desde centro de efectivo"
              aria-current={pathnameMatchesRoute(pathname, "/cash/hub-deposit") ? "page" : undefined}
              onClick={() => router.push("/cash/hub-deposit")}
              data-test-id="pos-topbar-hub-deposit"
            />
            <IconButton
              icon="BanknoteArrowUp"
              variant={topBarNavIconVariant(pathnameMatchesRoute(pathname, "/cash/hub-withdrawal"))}
              size="md"
              ariaLabel="Egreso de efectivo a centro de efectivo"
              title="Egreso a centro de efectivo"
              aria-current={
                pathnameMatchesRoute(pathname, "/cash/hub-withdrawal") ? "page" : undefined
              }
              onClick={() => router.push("/cash/hub-withdrawal")}
              data-test-id="pos-topbar-hub-withdrawal"
            />
            <IconButton
              icon="LockKeyhole"
              variant={topBarNavIconVariant(pathnameMatchesRoute(pathname, "/cash/closing"))}
              size="md"
              ariaLabel="Cerrar caja"
              title="Cerrar caja"
              aria-current={pathnameMatchesRoute(pathname, "/cash/closing") ? "page" : undefined}
              onClick={() => router.push("/cash/closing")}
              data-test-id="pos-topbar-cash-closing"
            />
            <PrintServiceTopBarDropdown
              panelVariant="pos"
              connected={printService.connected}
              health={printService.health}
              visual={printService.visual}
              lastError={printService.lastError}
              attemptedWsUrl={printService.attemptedWsUrl}
              reconnect={printService.reconnect}
              notifications={printService.notifications}
              unreadCount={printService.unreadCount}
              markNotificationsRead={printService.markNotificationsRead}
              clearNotifications={printService.clearNotifications}
              triggerClassName={`fs-icon-button fs-icon-button--basic-secondary inline-flex items-center justify-center w-10 h-10 shrink-0 ${
                printService.connected
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
              renderLocalAgentStatus={({ connected }) => {
                const label = connected
                  ? "Conectado al servicio local de impresión"
                  : "Sin conexión al servicio local de impresión";
                return (
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center"
                    title={label}
                    aria-label={label}
                    role="img"
                  >
                    {connected ? (
                      <Wifi
                        className="shrink-0 text-emerald-600 dark:text-emerald-400"
                        size={24}
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : (
                      <WifiOff
                        className="shrink-0 text-red-600 dark:text-red-400"
                        size={24}
                        strokeWidth={2}
                        aria-hidden
                      />
                    )}
                  </span>
                );
              }}
              data-test-id="pos-topbar-session-print"
            />
            <IconButton
              icon="LogOut"
              variant="text"
              size="md"
              ariaLabel="Cerrar sesión"
              onClick={() => signOut({ callbackUrl: "/" })}
              data-test-id="pos-topbar-logout"
            />
          </nav>
        </div>
      </div>
    </header>
  );
}
