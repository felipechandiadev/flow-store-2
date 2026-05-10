"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Building2, ImageOff, Image as ImageIcon, Store, User } from "lucide-react";
import IconButton from "@/shared/components/IconButton/IconButton";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

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

  const title = "FlowStore";
  const subtitle = "Punto de venta";
  const logoSrc = "/logo.png";

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
                  style={{ color: "var(--color-muted)" }}
                  data-test-id="top-bar-subtitle"
                >
                  {subtitle}
                </span>
              ) : null}
            </div>

            {/* A la derecha del bloque FlowStore / Punto de venta: empresa/PV + usuario/rol */}
            {showContextColumn || showUserColumn ? (
              <div className="flex min-w-0 items-center gap-6" data-test-id="pos-topbar-right-columns">
                {showContextColumn ? (
                  <div
                    className="flex min-w-0 flex-col gap-0 py-0.5 leading-none"
                    data-test-id="pos-topbar-context"
                    suppressHydrationWarning
                  >
                    {/* Línea empresa: ícono Building2 al lado del nombre de fantasía */}
                    {effectiveCompany ? (
                      <span
                        className="flex min-w-0 items-center gap-1.5 text-lg font-bold leading-tight tracking-tight"
                        style={{ color: "var(--color-foreground)" }}
                        data-test-id="pos-topbar-company-trade-name"
                        title={effectiveCompany}
                      >
                        <Building2
                          className="h-4 w-4 shrink-0"
                          strokeWidth={2}
                          aria-hidden
                          data-test-id="pos-topbar-company-icon"
                        />
                        <span className="min-w-0 truncate">{effectiveCompany}</span>
                      </span>
                    ) : null}
                    {/* Línea punto de venta: ícono Store al lado del nombre del PV */}
                    {effectivePosName ? (
                      <span
                        className={
                          effectiveCompany
                            ? "-mt-px flex min-w-0 items-center gap-1.5 text-[11px] font-normal leading-tight sm:text-xs"
                            : "flex min-w-0 items-center gap-1.5 text-lg font-bold leading-tight tracking-tight"
                        }
                        style={{
                          color: effectiveCompany ? "var(--color-muted)" : "var(--color-foreground)",
                        }}
                        data-test-id="pos-topbar-pos-name"
                        title={effectivePosName}
                      >
                        <Store
                          className={effectiveCompany ? "h-3 w-3 shrink-0" : "h-4 w-4 shrink-0"}
                          strokeWidth={2}
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
                    {/* Línea usuario: ícono User al lado del nombre */}
                    {effectivePerson ? (
                      <span
                        className="flex min-w-0 items-center gap-1.5 text-lg font-bold leading-tight tracking-tight"
                        style={{ color: "var(--color-foreground)" }}
                        data-test-id="pos-topbar-person-name"
                        title={effectivePerson}
                      >
                        <User
                          className="h-4 w-4 shrink-0"
                          strokeWidth={2}
                          aria-hidden
                          data-test-id="pos-topbar-user-icon"
                        />
                        <span className="min-w-0 truncate">{effectivePerson}</span>
                      </span>
                    ) : null}
                    {/* Línea rol: ícono BadgeCheck representando el rol del usuario */}
                    {effectiveRole ? (
                      <span
                        className={
                          effectivePerson
                            ? "-mt-px flex min-w-0 items-center gap-1.5 text-[11px] font-normal leading-tight sm:text-xs"
                            : "flex min-w-0 items-center gap-1.5 text-lg font-bold leading-tight tracking-tight"
                        }
                        style={{
                          color: effectivePerson ? "var(--color-muted)" : "var(--color-foreground)",
                        }}
                        data-test-id="pos-topbar-user-role"
                        title={effectiveRole}
                      >
                        <BadgeCheck
                          className={effectivePerson ? "h-3 w-3 shrink-0" : "h-4 w-4 shrink-0"}
                          strokeWidth={2}
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
              icon="Users"
              variant="basic"
              size="md"
              ariaLabel="Clientes"
              onClick={() => router.push("/customers")}
              data-test-id="pos-topbar-customers"
            />
            <IconButton
              icon="BanknoteArrowDown"
              variant="basic"
              size="md"
              ariaLabel="Operación de caja"
              onClick={() => router.push("/cash/movements")}
              data-test-id="pos-topbar-cash-op"
            />
            <IconButton
              icon="BanknoteArrowUp"
              variant="basic"
              size="md"
              ariaLabel="Operación de caja"
              onClick={() => router.push("/cash/movements")}
              data-test-id="pos-topbar-cash-op-up"
            />
            <IconButton
              icon="LockKeyhole"
              variant="basic"
              size="md"
              ariaLabel="Cerrar caja"
              title="Cerrar caja"
              onClick={() => router.push("/cash/closing")}
              data-test-id="pos-topbar-cash-closing"
            />
            <IconButton
              icon="LogOut"
              variant="basic"
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
