import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetSupplierPaymentContextQuery } from '@modules/transactions/application/queries/get-supplier-payment-context.query';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';

export interface SupplierPaymentContextDto {
  supplierId: string;
  supplierName: string;
  supplierDocument: string;
  companyId: string;
  companyName: string;
  supplierAccounts: Array<{
    id: string;
    accountName: string;
    accountCode: string;
    accountType: string;
  }>;
  companyAccounts: Array<{
    id: string;
    accountName: string;
    accountCode: string;
    accountType: string;
  }>;
  pendingPaymentAmount: number;
  pendingPaymentTransactions: Array<{
    paymentOutId: string;
    amount: number;
    status: string;
    createdAt: Date;
    documentNumber: string;
  }>;
}

@QueryHandler(GetSupplierPaymentContextQuery)
export class GetSupplierPaymentContextQueryHandler implements IQueryHandler<GetSupplierPaymentContextQuery> {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
  ) {}

  async execute(
    query: GetSupplierPaymentContextQuery,
  ): Promise<SupplierPaymentContextDto | null> {
    const { supplierId, companyId } = query;

    // Load supplier with company and accounts
    const supplier = await this.transactionRepository.manager
      .createQueryBuilder()
      .select('p.id', 'p_id')
      .addSelect('p.name', 'p_name')
      .addSelect('p.document', 'p_document')
      .addSelect('c.id', 'c_id')
      .addSelect('c.razon_social', 'company_razon_social')
      .from('people', 'p')
      .leftJoin('companies', 'c', 'c.id = :companyId', { companyId })
      .where('p.id = :supplierId', { supplierId })
      .getRawOne();

    if (!supplier) {
      return null;
    }

    // Load supplier accounts (accounts where supplier is the "who")
    const supplierAccounts = await this.transactionRepository.manager
      .createQueryBuilder()
      .select(['aa.id', 'aa.name', 'aa.code', 'aa.type'])
      .from('accounting_accounts', 'aa')
      .where(
        `aa.type LIKE :accountType AND aa.metadata->>'who' = :supplierId`,
        { accountType: 'SUPPLIER_%', supplierId },
      )
      .getRawMany();

    // Load company accounts (payable accounts for payment processing)
    const companyAccounts = await this.transactionRepository.manager
      .createQueryBuilder()
      .select(['aa.id', 'aa.name', 'aa.code', 'aa.type'])
      .from('accounting_accounts', 'aa')
      .where(
        `(aa.type = :accountType1 OR aa.type = :accountType2) AND aa.companyId = :companyId`,
        { accountType1: 'LIABILITY', accountType2: 'EXPENSE', companyId },
      )
      .getRawMany();

    // Calculate pending payment amount from PAYMENT_OUT transactions
    const pendingPayments = await this.transactionRepository.manager
      .createQueryBuilder()
      .select([
        'tx.id as paymentOutId',
        'tx.amount',
        'tx.status',
        'tx.createdAt',
        'tx.documentNumber',
      ])
      .from('transactions', 'tx')
      .where('tx.supplierId = :supplierId', { supplierId })
      .andWhere("tx.transactionType = 'PAYMENT_OUT'")
      .andWhere("tx.status = 'PENDING'")
      .andWhere('tx.companyId = :companyId', { companyId })
      .orderBy('tx.createdAt', 'ASC')
      .getRawMany();

    const pendingPaymentAmount = pendingPayments.reduce(
      (sum, p: any) => sum + Number(p.amount || 0),
      0,
    );

    return {
      supplierId,
      supplierName: supplier.p_name as string,
      supplierDocument: supplier.p_document as string,
      companyId,
      companyName: String(supplier.company_razon_social ?? ''),
      supplierAccounts: supplierAccounts.map((acc: any) => ({
        id: acc.aa_id,
        accountName: acc.aa_name,
        accountCode: acc.aa_code,
        accountType: acc.aa_type,
      })),
      companyAccounts: companyAccounts.map((acc: any) => ({
        id: acc.aa_id,
        accountName: acc.aa_name,
        accountCode: acc.aa_code,
        accountType: acc.aa_type,
      })),
      pendingPaymentAmount,
      pendingPaymentTransactions: pendingPayments.map((p: any) => ({
        paymentOutId: p.paymentOutId,
        amount: Number(p.amount),
        status: p.status,
        createdAt: new Date(p.createdAt),
        documentNumber: p.documentNumber,
      })),
    };
  }
}
