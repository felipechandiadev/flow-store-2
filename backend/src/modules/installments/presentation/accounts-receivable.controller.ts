import { Controller, Get, Query } from '@nestjs/common';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { InstallmentStatus } from '@modules/installments/domain/installment.entity';

@Controller('accounts-receivable')
export class AccountsReceivableController {
  constructor(private readonly installmentService: InstallmentService) {}

  @Get()
  async getAccountsReceivable(
    @Query('filters') filtersRaw?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    let filters: any = {};
    if (filtersRaw) {
      try {
        filters = JSON.parse(filtersRaw);
      } catch (err) {
        filters = {};
      }
    }

    const includePaid = Boolean(filters.includePaid);
    const status = filters.status
      ? Array.isArray(filters.status)
        ? filters.status
        : String(filters.status).split(',')
      : undefined;

    const {
      rows,
      total,
      page: resolvedPage,
      pageSize: resolvedPageSize,
    } = await this.installmentService.getAccountsReceivable({
      includePaid,
      status: status as InstallmentStatus[] | undefined,
      customerId: filters.customerId,
      search: filters.search,
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });

    const mappedRows = rows.map((inst) => {
      const transaction = (inst as any).saleTransaction;
      const person = transaction?.customer?.person;
      const customerName =
        (person?.businessName ?? '').trim() ||
        [person?.firstName, person?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        null;

      return {
        id: inst.id,
        documentNumber:
          transaction?.documentNumber ?? inst.sourceTransactionId ?? null,
        customerName,
        quotaNumber: inst.installmentNumber,
        totalQuotas: inst.totalInstallments,
        dueDate: inst.dueDate,
        quotaAmount: Number(inst.amount),
        status: inst.status,
        createdAt: transaction?.createdAt ?? inst.createdAt,
      };
    });

    return {
      rows: mappedRows,
      total,
      page: resolvedPage,
      pageSize: resolvedPageSize,
    };
  }
}
