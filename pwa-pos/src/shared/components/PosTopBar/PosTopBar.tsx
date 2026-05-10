"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { ImageOff, Image as ImageIcon, Store, User } from "lucide-react";
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
                  <div className="flex min-w-0 items-center gap-3" data-test-id="pos-topbar-context-wrap">
                    <Store
                      className="h-10 w-10 shrink-0 text-primary"
                      strokeWidth={1.5}
                      aria-hidden
                      data-test-id="pos-topbar-store-icon"
                    />
                    <div
                      className="flex min-w-0 flex-col gap-0 py-0.5 leading-none"
                      data-test-id="pos-topbar-context"
                      suppressHydrationWarning
                    >
                      {/* Misma tipografía que FlowStore + Punto de venta: título (bold lg) / subtítulo (11px muted) */}
                      {effectiveCompany ? (
                        <span
                          className="block min-w-0 truncate text-lg font-bold leading-tight tracking-tight"
                          style={{ color: "var(--color-foreground)" }}
                          data-test-id="pos-topbar-company-trade-name"
                          title={effectiveCompany}
                        >
                          {effectiveCompany}
                        </span>
                      ) : null}
                      {effectivePosName ? (
                        <span
                          className={
                            effectiveCompany
                              ? "-mt-px block min-w-0 truncate text-[11px] font-normal leading-tight sm:text-xs"
                              : "block min-w-0 truncate text-lg font-bold leading-tight tracking-tight"
                          }
                          style={{
                            color: effectiveCompany ? "var(--color-muted)" : "var(--color-foreground)",
                          }}
                          data-test-id="pos-topbar-pos-name"
                          title={effectivePosName}
                        >
                          {effectivePosName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {showUserColumn ? (
                  <div className="flex min-w-0 items-center gap-3" data-test-id="pos-topbar-user-wrap">
                    <User
                      className="h-10 w-10 shrink-0 text-primary"
                      strokeWidth={1.5}
                      aria-hidden
                      data-test-id="pos-topbar-user-icon"
                    />
                    <div className="flex min-w-0 flex-col gap-0 py-0.5 leading-none" data-test-id="pos-topbar-user">
                      {effectivePerson ? (
                        <span
                          className="block min-w-0 truncate text-lg font-bold leading-tight tracking-tight"
                          style={{ color: "var(--color-foreground)" }}
                          data-test-id="pos-topbar-person-name"
                          title={effectivePerson}
                        >
                          {effectivePerson}
                        </span>
                      ) : null}
                      {effectiveRole ? (
                        <span
                          className={
                            effectivePerson
                              ? "-mt-px block min-w-0 truncate text-[11px] font-normal leading-tight sm:text-xs"
                              : "block min-w-0 truncate text-lg font-bold leading-tight tracking-tight"
                          }
                          style={{
                            color: effectivePerson ? "var(--color-muted)" : "var(--color-foreground)",
                          }}
                          data-test-id="pos-topbar-user-role"
                          title={effectiveRole}
                        >
                          {effectiveRole}
                        </span>
                      ) : null}
                    </div>
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
