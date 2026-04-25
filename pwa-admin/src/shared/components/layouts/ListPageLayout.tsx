"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import TextField from "../TextField/TextField";
import IconButton from "../IconButton/IconButton";

export type ListPageLayoutProps = {
  /** Título principal (arriba a la izquierda). Si está vacío y no hay subtítulo, no se reserva espacio. */
  title?: string;
  /** Subtítulo bajo el título. Si está vacío, no se muestra. */
  subtitle?: string;
  /** Acción del botón + (izquierda). Si se omite, el botón no se renderiza. */
  onAddClick?: () => void;
  /** Etiqueta accesible del botón añadir */
  addButtonAriaLabel?: string;
  /** Mostrar barra de búsqueda sincronizada con la URL (query). */
  showSearch?: boolean;
  /** Nombre del parámetro en la query (p. ej. `search` → `?search=...`). */
  searchParamName?: string;
  /** Etiqueta flotante del TextField de búsqueda */
  searchLabel?: string;
  searchPlaceholder?: string;
  /** Contenido principal (p. ej. tabla o lista renderizada en el servidor). */
  children: React.ReactNode;
  className?: string;
  "data-test-id"?: string;
};

const SEARCH_DEBOUNCE_MS = 300;

function ListPageLayoutView({
  title,
  subtitle,
  onAddClick,
  addButtonAriaLabel = "Añadir",
  showSearch = true,
  searchParamName = "search",
  searchLabel = "Buscar",
  searchPlaceholder = "Buscar…",
  children,
  className = "",
  "data-test-id": dataTestId,
}: ListPageLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramValue = searchParams.get(searchParamName) ?? "";
  const [searchInput, setSearchInput] = useState(paramValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchInput(paramValue);
  }, [paramValue]);

  const pushQuery = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) {
        next.set(searchParamName, trimmed);
      } else {
        next.delete(searchParamName);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParamName, searchParams]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setSearchInput(v);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      pushQuery(v);
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
  };

  const showHeading = Boolean((title && title.trim()) || (subtitle && subtitle.trim()));

  return (
    <div
      className={`flex w-full flex-col gap-4 ${className}`.trim()}
      data-test-id={dataTestId ?? "list-page-layout-root"}
    >
      {showHeading ? (
        <header className="min-w-0">
          {title && title.trim() ? (
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          ) : null}
          {subtitle && subtitle.trim() ? (
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          ) : null}
        </header>
      ) : null}

      <div
        className={`flex w-full flex-row flex-wrap items-end gap-3 ${
          onAddClick && showSearch ? "justify-between" : showSearch ? "justify-end" : "justify-start"
        }`}
      >
        {onAddClick ? (
          <div className="flex shrink-0 items-center" data-test-id="list-page-layout-add-wrap">
            <IconButton
              icon="Plus"
              variant="containedPrimary"
              size="md"
              ariaLabel={addButtonAriaLabel}
              onClick={onAddClick}
              data-test-id="list-page-layout-add"
            />
          </div>
        ) : null}
        {showSearch ? (
          <div className="w-full min-w-0 max-w-md">
            <TextField
              label={searchLabel}
              value={searchInput}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              name={searchParamName}
              startAdornment={<Search className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />}
              data-test-id="list-page-layout-search"
            />
          </div>
        ) : null}
      </div>

      <section className="min-h-0 w-full flex-1" data-test-id="list-page-layout-content">
        {children}
      </section>
    </div>
  );
}

function ListPageLayoutFallback({ title, subtitle, children, className }: Partial<ListPageLayoutProps> & { children: React.ReactNode }) {
  const showHeading = Boolean((title && title.trim()) || (subtitle && subtitle.trim()));
  return (
    <div className={`flex w-full flex-col gap-4 ${className ?? ""}`.trim()}>
      {showHeading ? (
        <header>
          {title && title.trim() ? <h1 className="text-2xl font-semibold text-foreground">{title}</h1> : null}
          {subtitle && subtitle.trim() ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </header>
      ) : null}
      <div className="h-11 w-full max-w-md animate-pulse rounded-md bg-neutral/60 md:ml-auto" aria-hidden />
      <section className="w-full">{children}</section>
    </div>
  );
}

/**
 * Plantilla de página de listado: título/subtítulo opcionales, fila con acción “+” y búsqueda
 * que persiste en la query string (adecuado para combinar con contenido SSR).
 * Incluye `Suspense` porque usa `useSearchParams`.
 */
export function ListPageLayout(props: ListPageLayoutProps) {
  return (
    <Suspense fallback={<ListPageLayoutFallback {...props} />}>
      <ListPageLayoutView {...props} />
    </Suspense>
  );
}

export default ListPageLayout;
