import type { CatalogProductType } from "@/features/inventory-products/types/product-grid.types";

const CATALOG_PRODUCT_TYPE_IDS = new Set<CatalogProductType>([
  "PHYSICAL",
  "MANUFACTURADO",
  "ELABORADO",
  "PREPARADO",
  "SERVICE",
  "DIGITAL",
]);

/** Acepta valores API; si no coincide con el catálogo conocido, físico. */
export function normalizeCatalogProductType(raw: string | null | undefined): CatalogProductType {
  const u = (raw ?? "PHYSICAL").toString().toUpperCase() as CatalogProductType;
  return CATALOG_PRODUCT_TYPE_IDS.has(u) ? u : "PHYSICAL";
}

const RECIPE_BOM_ALLOWED_TYPES = new Set<CatalogProductType>(["SERVICE", "MANUFACTURADO", "PREPARADO", "ELABORADO"]);

/** Solo estos tipos pueden tener receta / BOM en catálogo admin. */
export function catalogProductTypeAllowsRecipeBom(raw: string | null | undefined): boolean {
  const u = normalizeCatalogProductType(raw);
  return RECIPE_BOM_ALLOWED_TYPES.has(u);
}

/** Opciones del selector de tipo de producto (crear / editar). */
export const CATALOG_PRODUCT_TYPE_SELECT_OPTIONS: { id: CatalogProductType; label: string }[] = [
  { id: "PHYSICAL", label: "Producto físico" },
  { id: "MANUFACTURADO", label: "Manufacturado" },
  { id: "ELABORADO", label: "Elaborado" },
  { id: "PREPARADO", label: "Preparado" },
  { id: "SERVICE", label: "Servicio" },
  { id: "DIGITAL", label: "Digital" },
];
