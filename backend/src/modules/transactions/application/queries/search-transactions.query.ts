export class SearchTransactionsQuery {
  constructor(
    readonly page: number = 1,
    readonly limit: number = 25,
    readonly type?: string,
    readonly status?: string,
    readonly paymentMethod?: string,
    readonly branchId?: string,
    readonly pointOfSaleId?: string,
    readonly customerId?: string,
    readonly supplierId?: string,
    readonly dateFrom?: string,
    readonly dateTo?: string,
    readonly search?: string,
  ) {}
}
