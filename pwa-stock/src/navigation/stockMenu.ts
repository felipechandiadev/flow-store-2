import type { SideBarMenuItem } from "@/shared/components/SideBar/SideBar";
import { SCAN_PATH, SEARCH_PATH } from "@/features/variant/lib/variant-routes";

/** Menú lateral StockControl (misma estructura que pwa-admin SideBar). */
export const stockMenuItems: SideBarMenuItem[] = [
  { id: "stock-scan", label: "Escanear", url: SCAN_PATH },
  { id: "stock-search", label: "Motor de búsqueda", url: SEARCH_PATH },
];
