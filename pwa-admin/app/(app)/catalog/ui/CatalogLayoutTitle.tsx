"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

const ROUTES: readonly { prefix: string; label: string }[] = [
  { prefix: "/catalog/products", label: "Productos" },
  { prefix: "/catalog/categories", label: "Categorías" },
  { prefix: "/catalog/brands", label: "Marcas" },
  { prefix: "/catalog/attributes", label: "Atributos" },
] as const;

function sectionLabel(pathname: string): string {
  const matches = ROUTES.filter(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  if (matches.length === 0) {
    return "Catálogo";
  }
  return [...matches].sort((a, b) => b.prefix.length - a.prefix.length)[0]!.label;
}

/**
 * Título principal (h1) del layout Catálogo según la ruta activa.
 */
export function CatalogLayoutTitle() {
  const pathname = usePathname();
  const label = useMemo(() => sectionLabel(pathname), [pathname]);
  return <>{label}</>;
}
