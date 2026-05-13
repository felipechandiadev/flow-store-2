export type StockAlertKind =
  | 'below_minimum'
  | 'above_maximum'
  | 'reorder';

export type StockUpdatedPayload = {
  companyId: string;
  storageId: string;
  productVariantId: string;
  physicalStock: number;
  availableStock: number;
  transactionId?: string | null;
  alerts: StockAlertKind[];
};
