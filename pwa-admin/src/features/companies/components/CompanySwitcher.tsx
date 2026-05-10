"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown } from "lucide-react";
import { switchCompanyAction } from "../actions/companies.action";
import type { CompanyOption } from "../types/company.types";

interface CompanySwitcherProps {
  /** Si se quiere forzar el listado (para testing). Si no, se toma de la session. */
  fallbackCompanies?: CompanyOption[];
}

const CompanySwitcher: React.FC<CompanySwitcherProps> = ({
  fallbackCompanies,
}) => {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement | null>(null);

  const role = (session?.user as any)?.role as string | null | undefined;
  const activeCompanyId = (session?.user as any)?.activeCompanyId as
    | string
    | null
    | undefined;
  const sessionCompanies = (session?.user as any)?.companies as
    | CompanyOption[]
    | null
    | undefined;

  const companies = useMemo<CompanyOption[]>(() => {
    if (Array.isArray(sessionCompanies) && sessionCompanies.length > 0) {
      return sessionCompanies;
    }
    return Array.isArray(fallbackCompanies) ? fallbackCompanies : [];
  }, [sessionCompanies, fallbackCompanies]);

  const activeCompany = useMemo<CompanyOption | null>(() => {
    if (!activeCompanyId) return null;
    return companies.find((c) => c.id === activeCompanyId) ?? null;
  }, [companies, activeCompanyId]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      window.addEventListener("mousedown", onClick);
      return () => window.removeEventListener("mousedown", onClick);
    }
    return undefined;
  }, [open]);

  // Solo ADMIN ve el switcher con dropdown.
  // Operador: ver el nombre de su empresa fija sin acción.
  const isAdmin = role === "ADMIN";

  if (!session?.user) return null;
  if (companies.length === 0) return null;

  const label =
    activeCompany?.nombreFantasia?.trim() ||
    activeCompany?.razonSocial?.trim() ||
    "Sin empresa";

  if (!isAdmin) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-foreground">
        <Building2 size={14} className="text-muted" aria-hidden />
        <span className="truncate font-semibold" title={label}>
          {label}
        </span>
      </div>
    );
  }

  function handleSelect(companyId: string) {
    if (companyId === activeCompanyId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await switchCompanyAction(companyId);
      if (res.success) {
        // Actualizar el JWT/session de next-auth con el nuevo activeCompanyId.
        await update({ activeCompanyId: res.activeCompanyId });
        setOpen(false);
        router.refresh();
      } else {
        alert(`Error al cambiar de empresa: ${res.error}`);
      }
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold text-foreground transition hover:border-secondary disabled:opacity-60"
        disabled={pending}
        data-test-id="company-switcher-button"
      >
        <Building2 size={14} className="text-muted" aria-hidden />
        <span className="max-w-[10rem] truncate" title={label}>
          {label}
        </span>
        <ChevronDown size={14} className="text-muted" aria-hidden />
      </button>
      {open ? (
        <div
          className="absolute right-0 z-50 mt-1 min-w-[14rem] overflow-hidden rounded-md border border-border bg-background shadow-lg"
          role="listbox"
          data-test-id="company-switcher-dropdown"
        >
          <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Cambiar empresa
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {companies.map((c) => {
              const isActive = c.id === activeCompanyId;
              const optionLabel =
                c.nombreFantasia?.trim() || c.razonSocial.trim();
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted/10 ${
                      isActive ? "font-semibold text-foreground" : "text-foreground"
                    }`}
                  >
                    <span className="min-w-0 truncate">{optionLabel}</span>
                    {isActive ? (
                      <Check size={14} className="shrink-0 text-secondary" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default CompanySwitcher;
