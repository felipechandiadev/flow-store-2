import React from "react";

export type TabPageLayoutProps = {
  /** Título principal (h1), columna izquierda (~30vw en `md+`). */
  title?: React.ReactNode;
  /** Texto o nodo bajo el título. */
  subtitle?: React.ReactNode;
  /**
   * Navegación por pestañas (p. ej. `<Tabs items={...} />` desde un Client Component).
   * Columna derecha; en pantallas chicas va debajo del título.
   */
  tabs?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Clases extra en el contenedor del encabezado (fila título + tabs). */
  headerClassName?: string;
  "data-test-id"?: string;
};

function hasChunk(node: React.ReactNode): boolean {
  if (node == null || node === false) {
    return false;
  }
  if (typeof node === "string") {
    return node.trim().length > 0;
  }
  if (typeof node === "number") {
    return true;
  }
  return true;
}

/**
 * Layout de página con pestañas: raíz y área de contenido alineados a {@link CollectionPageLayout}
 * (`flex w-full min-w-0 max-w-full flex-col gap-4` + contenido `min-h-0 min-w-0 w-full max-w-full flex-1`).
 *
 * Encabezado en `md+`: a la izquierda ~**30vw** para título (+ subtítulo); a la derecha
 * el slot `tabs` alineado a la **derecha** (p. ej. `Tabs`). En viewport angosto se apilan (título arriba).
 */
export function TabPageLayout({
  title,
  subtitle,
  tabs,
  children,
  className = "",
  contentClassName = "",
  headerClassName = "",
  "data-test-id": dataTestId,
}: TabPageLayoutProps) {
  const showTitle = hasChunk(title);
  const showSubtitle = hasChunk(subtitle);
  const showHeading = showTitle || showSubtitle;
  const showTabs = hasChunk(tabs);

  const titleBlock =
    showTitle || showSubtitle ? (
      <>
        {showTitle ? (
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        ) : null}
        {showSubtitle ? (
          <p
            className={showTitle ? "mt-1 text-sm text-muted" : "text-sm text-muted"}
            data-test-id="tab-page-layout-subtitle"
          >
            {subtitle}
          </p>
        ) : null}
      </>
    ) : null;

  return (
    <div
      className={`flex w-full min-w-0 max-w-full flex-col gap-4 ${className}`.trim()}
      data-test-id={dataTestId ?? "tab-page-layout"}
    >
      {showHeading || showTabs ? (
        <header
          className={`w-full min-w-0 shrink-0 ${headerClassName}`.trim()}
          data-test-id="tab-page-layout-header"
        >
          {showHeading && showTabs ? (
            <div className="flex w-full min-w-0 flex-col gap-3 md:flex-row md:items-end md:gap-4">
              <div className="min-w-0 w-full md:w-[30vw] md:max-w-[30vw] md:shrink-0">{titleBlock}</div>
              <div className="flex min-w-0 w-full justify-end md:flex-1 md:overflow-x-auto md:pb-px">
                {tabs}
              </div>
            </div>
          ) : showHeading ? (
            <div className="min-w-0">{titleBlock}</div>
          ) : (
            <div className="flex min-w-0 w-full justify-end overflow-x-auto md:pb-px">{tabs}</div>
          )}
        </header>
      ) : null}

      <section
        className={`min-h-0 min-w-0 w-full max-w-full flex-1 ${contentClassName}`.trim()}
        data-test-id="tab-page-layout-content"
      >
        {children}
      </section>
    </div>
  );
}
