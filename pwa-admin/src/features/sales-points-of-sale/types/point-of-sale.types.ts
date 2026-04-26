/**
 * DTO alineado con el mapa del backend (PosService.mapPointOfSale).
 */
export type PointOfSaleListItem = {
  id: string;
  name: string;
  branchId?: string | null;
  branch?: { id: string; name: string } | null;
  priceLists: Array<{ id: string; name: string; isActive: boolean }>;
  deviceId?: string | null;
  isActive: boolean;
  defaultPriceListId: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListPointsOfSaleResult =
  | { success: true; pointsOfSale: PointOfSaleListItem[] }
  | { success: false; error: string; pointsOfSale: [] };

export type CreatePointOfSaleResult =
  | { success: true; pointOfSale: PointOfSaleListItem }
  | { success: false; error: string };

export type DeletePointOfSaleResult = { success: true } | { success: false; error: string };
