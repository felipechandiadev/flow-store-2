export type PosPriceList = { id: string; name: string; isActive: boolean };

export type PointOfSaleListItem = {
  id: string;
  name: string;
  branchId?: string | null;
  branch?: { id: string; name: string } | null;
  priceLists: PosPriceList[];
  deviceId?: string | null;
  isActive: boolean;
  defaultPriceListId: string | null;
};

export type ListPointsOfSaleResult =
  | { success: true; pointsOfSale: PointOfSaleListItem[] }
  | { success: false; error: string; pointsOfSale: [] };

