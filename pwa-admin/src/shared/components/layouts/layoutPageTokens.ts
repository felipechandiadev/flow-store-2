/**
 * Clases compartidas entre {@link BasicPageLayout}, {@link TabPageLayout} y {@link CollectionPageLayout}
 * para raíz, cabecera, título, subtítulo y contenido principal.
 */
export const layoutPageRootClassName =
  "flex w-full min-w-0 max-w-full flex-col gap-4";

/** Bloque de cabecera (título / subtítulo / toolbar). */
export const layoutPageHeaderClassName = "w-full min-w-0";

/** Título principal (h1). En Collection la fila compacta añade `whitespace-nowrap`. */
export const layoutPageTitleClassName =
  "text-lg font-semibold tracking-tight text-foreground";

export const layoutPageSubtitleClassName = "mt-1 text-sm text-muted";

/** Contenedor principal bajo la cabecera (scroll / flex en página). */
export const layoutPageContentClassName =
  "min-h-0 min-w-0 w-full max-w-full flex-1";
