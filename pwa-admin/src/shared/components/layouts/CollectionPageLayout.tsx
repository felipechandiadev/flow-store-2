"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import TextField from "../TextField/TextField";
import IconButton from "../IconButton/IconButton";

/**
 * Columnas de la grilla (mobile-first). Valores 1–12. Omite claves no definidas.
 */
export type CollectionGridColumnConfig = {
  default?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  "2xl"?: number;
};

export type CollectionPageLayoutProps = {
  /** Título principal (arriba a la izquierda). Si está vacío y no hay subtítulo, no se reserva espacio. */
  title?: string;
  /** Subtítulo bajo el título. Si está vacío, no se muestra. */
  subtitle?: string;
  /**
   * Slot de la acción “añadir” (izquierda). Pasa un componente cliente (p. ej. botón + Dialog)
   * creado en la feature. Si está definido, sustituye al `IconButton` por defecto y se ignora
   * `onAddClick` / `addButtonAriaLabel` salvo que no quieras pasar `addAction` y uses el botón genérico.
   */
  addAction?: React.ReactNode;
  /** Acción del botón + integrado (solo si no usas `addAction`). */
  onAddClick?: () => void;
  /** Etiqueta accesible del botón + por defecto (solo sin `addAction`). */
  addButtonAriaLabel?: string;
  /** Mostrar barra de búsqueda sincronizada con la URL (query). */
  showSearch?: boolean;
  /** Nombre del parámetro en la query (p. ej. `search` → `?search=...`). */
  searchParamName?: string;
  /** Etiqueta flotante del TextField de búsqueda */
  searchLabel?: string;
  searchPlaceholder?: string;
  /**
   * Contenido libre. Si `contentItems` está definido (incl. `[]`), la sección principal no usa
   * `children`: con ítems muestra grilla; con array vacío muestra vacío centrado.
   */
  children?: React.ReactNode;
  /**
   * Celdas en grilla. Si se pasa un array **vacío** (sin datos, o filtro sin coincidencias),
   * se muestra un mensaje centrado (ver `contentEmptyMessage`), no `children`.
   * Si el array tiene elementos, se renderizan en grilla; `children` se ignora.
   */
  contentItems?: React.ReactNode[];
  /**
   * Texto mostrado centrado cuando `contentItems` es `[]` (sin datos, filtro, etc.; genérico, no solo búsqueda).
   * @default "No hay nada que mostrar"
   */
  contentEmptyMessage?: string;
  /**
   * Número de columnas fijo, o desglose por breakpoint. Por defecto 1.
   * Solo aplica con `contentItems` no vacío.
   */
  contentGridColumns?: number | CollectionGridColumnConfig;
  /**
   * Clase de separación entre celdas (p. ej. `gap-4`, `gap-3 md:gap-6`). Por defecto `gap-4`.
   */
  contentGridGapClassName?: string;
  /**
   * Clases extra en el contenedor de la grilla (p. ej. alineación o `self-stretch`).
   */
  contentGridClassName?: string;
  /**
   * Alineación vertical de las celdas en la grilla. `stretch` iguala la altura de la fila
   * a la card más alta (útil con cards `fillHeight`).
   * @default 'start'
   */
  contentGridItemsAlign?: "start" | "stretch";
  className?: string;
  "data-test-id"?: string;
};

const SEARCH_DEBOUNCE_MS = 300;

/** Mapeo explícito para el scanner de Tailwind (evitar clases dinámicas). */
const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
  9: "grid-cols-9",
  10: "grid-cols-10",
  11: "grid-cols-11",
  12: "grid-cols-12",
};

function clampGridCols(n: number): number {
  if (Number.isNaN(n)) return 1;
  return Math.min(12, Math.max(1, Math.round(n)));
}

function gridColToken(n: number): string {
  return GRID_COLS[clampGridCols(n)] ?? "grid-cols-1";
}

export function buildContentGridClassNames(
  cols: number | CollectionGridColumnConfig | undefined
): string {
  if (cols == null) {
    return "grid-cols-1";
  }
  if (typeof cols === "number") {
    return gridColToken(cols);
  }
  const parts: string[] = [];
  parts.push(cols.default != null ? gridColToken(cols.default) : "grid-cols-1");
  if (cols.sm != null) parts.push(`sm:${gridColToken(cols.sm)}`);
  if (cols.md != null) parts.push(`md:${gridColToken(cols.md)}`);
  if (cols.lg != null) parts.push(`lg:${gridColToken(cols.lg)}`);
  if (cols.xl != null) parts.push(`xl:${gridColToken(cols.xl)}`);
  if (cols["2xl"] != null) parts.push(`2xl:${gridColToken(cols["2xl"])}`);
  return parts.join(" ");
}

const DEFAULT_CONTENT_EMPTY_MESSAGE = "No hay nada que mostrar";

function renderContentSection(
  contentItems: React.ReactNode[] | undefined,
  contentGridColumns: number | CollectionGridColumnConfig | undefined,
  contentGridGapClassName: string | undefined,
  contentGridClassName: string | undefined,
  contentEmptyMessage: string | undefined,
  contentGridItemsAlign: "start" | "stretch" | undefined,
  children: React.ReactNode
) {
  if (contentItems !== undefined) {
    if (contentItems.length === 0) {
      const text = (contentEmptyMessage ?? DEFAULT_CONTENT_EMPTY_MESSAGE).trim() || DEFAULT_CONTENT_EMPTY_MESSAGE;
      return (
        <div
          className="flex min-h-[12rem] w-full min-w-0 flex-1 flex-col items-center justify-center py-10"
          data-test-id="collection-page-layout-empty"
        >
          <p className="text-center text-sm text-muted">{text}</p>
        </div>
      );
    }
    const colClass = buildContentGridClassNames(
      contentGridColumns ?? 1
    );
    const gap = contentGridGapClassName?.trim() || "gap-4";
    const alignClass = contentGridItemsAlign === "stretch" ? "items-stretch" : "items-start";
    const cellClass =
      contentGridItemsAlign === "stretch"
        ? "flex h-full min-h-0 min-w-0 flex-col"
        : "min-w-0";
    return (
      <div
        className={`grid w-full min-w-0 ${alignClass} ${colClass} ${gap} ${contentGridClassName ?? ""}`.trim()}
        data-test-id="collection-page-layout-grid"
      >
        {contentItems.map((item, i) => (
          <div key={i} className={cellClass} data-test-id={`collection-page-layout-cell-${i}`}>
            {item}
          </div>
        ))}
      </div>
    );
  }
  return children;
}

function CollectionPageLayoutView({
  title,
  subtitle,
  addAction,
  onAddClick,
  addButtonAriaLabel = "Añadir",
  showSearch = true,
  searchParamName = "search",
  searchLabel = "Buscar",
  searchPlaceholder = "Buscar…",
  children,
  contentItems,
  contentGridColumns,
  contentGridGapClassName,
  contentGridClassName,
  contentEmptyMessage,
  contentGridItemsAlign,
  className = "",
  "data-test-id": dataTestId,
}: CollectionPageLayoutProps) {
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
  const hasCustomAdd = addAction !== undefined;
  const hasDefaultAdd = !hasCustomAdd && onAddClick != null;
  const hasAddSlot = hasCustomAdd || hasDefaultAdd;

  return (
    <div
      className={`flex w-full min-w-0 max-w-full flex-col gap-4 ${className}`.trim()}
      data-test-id={dataTestId ?? "collection-page-layout-root"}
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
          hasAddSlot && showSearch ? "justify-between" : showSearch ? "justify-end" : "justify-start"
        }`}
      >
        {hasAddSlot ? (
          <div className="flex shrink-0 items-center" data-test-id="collection-page-layout-add-wrap">
            {hasCustomAdd ? addAction : hasDefaultAdd ? (
              <IconButton
                icon="Plus"
                variant="ghost"
                size="md"
                ariaLabel={addButtonAriaLabel}
                onClick={onAddClick!}
                data-test-id="collection-page-layout-add"
              />
            ) : null}
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
              data-test-id="collection-page-layout-search"
            />
          </div>
        ) : null}
      </div>

      <section className="min-h-0 min-w-0 w-full max-w-full flex-1" data-test-id="collection-page-layout-content">
        {renderContentSection(
          contentItems,
          contentGridColumns,
          contentGridGapClassName,
          contentGridClassName,
          contentEmptyMessage,
          contentGridItemsAlign,
          children
        )}
      </section>
    </div>
  );
}

function CollectionPageLayoutFallback({
  title,
  subtitle,
  addAction,
  onAddClick,
  showSearch = true,
  children,
  contentItems,
  contentGridColumns,
  contentGridGapClassName,
  contentGridClassName,
  contentEmptyMessage,
  contentGridItemsAlign,
  className,
}: CollectionPageLayoutProps) {
  const showHeading = Boolean((title && title.trim()) || (subtitle && subtitle.trim()));
  const hasContentItems = contentItems != null;
  const hasGrid = hasContentItems && contentItems.length > 0;
  const isContentEmpty = hasContentItems && contentItems.length === 0;
  const hasCustomAdd = addAction !== undefined;
  const hasDefaultAdd = !hasCustomAdd && onAddClick != null;
  const hasAddSlot = hasCustomAdd || hasDefaultAdd;
  const emptyText = (contentEmptyMessage ?? DEFAULT_CONTENT_EMPTY_MESSAGE).trim() || DEFAULT_CONTENT_EMPTY_MESSAGE;
  const fallbackAlignClass = contentGridItemsAlign === "stretch" ? "items-stretch" : "items-start";
  return (
    <div className={`flex w-full min-w-0 max-w-full flex-col gap-4 ${className ?? ""}`.trim()}>
      {showHeading ? (
        <header>
          {title && title.trim() ? <h1 className="text-2xl font-semibold text-foreground">{title}</h1> : null}
          {subtitle && subtitle.trim() ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </header>
      ) : null}
      <div
        className={`flex w-full flex-row flex-wrap items-end gap-3 ${
          hasAddSlot && showSearch ? "justify-between" : showSearch ? "justify-end" : "justify-start"
        }`}
      >
        {hasAddSlot ? (
          <div
            className="h-10 w-10 shrink-0 animate-pulse rounded-md bg-neutral/60"
            aria-hidden
            data-test-id="collection-page-layout-add-skeleton"
          />
        ) : null}
        {showSearch ? (
          <div className="h-11 w-full max-w-md animate-pulse rounded-md bg-neutral/60 md:ml-auto" aria-hidden />
        ) : null}
      </div>
      <section className="min-w-0 w-full max-w-full">
        {hasGrid && contentItems ? (
          <div
            className={`grid w-full min-w-0 ${fallbackAlignClass} ${buildContentGridClassNames(
              contentGridColumns ?? 1
            )} ${contentGridGapClassName?.trim() || "gap-4"} ${contentGridClassName ?? ""}`.trim()}
          >
            {contentItems.map((_, i) => (
              <div
                key={i}
                className="h-32 min-w-0 animate-pulse rounded-md bg-neutral/60"
                aria-hidden
                data-test-id={`collection-page-layout-cell-skeleton-${i}`}
              />
            ))}
          </div>
        ) : isContentEmpty ? (
          <div
            className="flex min-h-[12rem] w-full min-w-0 flex-col items-center justify-center py-10"
            data-test-id="collection-page-layout-empty"
          >
            <p className="text-center text-sm text-muted">{emptyText}</p>
          </div>
        ) : (
          children
        )}
      </section>
    </div>
  );
}

/**
 * Plantilla de página de colección/índice: título y subtítulo opcionales, fila con acción “+” y
 * búsqueda que persiste en la query. Opcionalmente `addAction` (nodo React) sustituye el `IconButton`
 * integrado para que cada feature inyecte botón + diálogos propios. Opcionalmente `contentItems` y
 * `contentGridColumns` para grilla en el área de contenido. Incluye `Suspense` por `useSearchParams`.
 */
export function CollectionPageLayout(props: CollectionPageLayoutProps) {
  return (
    <Suspense fallback={<CollectionPageLayoutFallback {...props} />}>
      <CollectionPageLayoutView {...props} />
    </Suspense>
  );
}

export default CollectionPageLayout;
