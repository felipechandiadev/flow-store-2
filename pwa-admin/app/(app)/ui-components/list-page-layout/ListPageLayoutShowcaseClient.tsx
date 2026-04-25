"use client";

import { ListPageLayout } from "@/shared/components/layouts";

/**
 * Capa cliente mínima: acción Añadir y el layout con búsqueda en la URL.
 * Recibe <code>children</code> del servidor o de otros RSC.
 */
export function ListPageLayoutShowcaseClient({ children }: { children: React.ReactNode }) {
  return (
    <ListPageLayout
      title="ListPageLayout"
      subtitle="Título y subtítulo opcionales, botón + a la izquierda, búsqueda a la derecha (space-between), query ?search= para SSR."
      onAddClick={() => {
        window.alert("Acción añadir (en una página real: abrir diálogo o navegar a /new).");
      }}
      addButtonAriaLabel="Añadir (demo)"
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Escribe y mira la barra de direcciones…"
    >
      {children}
    </ListPageLayout>
  );
}
