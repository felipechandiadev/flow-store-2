import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, LessThan } from 'typeorm';
import { AnalyticsRepositoryPort } from '../../application/ports/analytics.repository.port';
import { DashboardStats } from '../../domain/dashboard-stats';
import { Customer } from '@modules/customers/domain/customer.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '@modules/transactions/domain/transaction.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';

@Injectable()
export class TypeOrmAnalyticsRepository implements AnalyticsRepositoryPort {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(StockLevel)
    private readonly stockLevelRepository: Repository<StockLevel>,
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const totalCustomers = await this.customerRepository.count({
      where: { isActive: true },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const raw = await this.transactionRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.total),0)', 'sum')
      .where('t.transactionType = :sale', { sale: TransactionType.SALE })
      .andWhere('t.createdAt >= :today', { today: todayStart })
      .getRawOne();

    const salesToday = Number(raw?.sum || 0);

    const threshold = 10;
    const lowStockItems = await this.stockLevelRepository.count({
      where: { availableStock: LessThan(threshold) },
    });

    const openOrders = await this.transactionRepository.count({
      where: {
        transactionType: TransactionType.PURCHASE_ORDER,
        status: Not(TransactionStatus.CANCELLED),
      },
    });

    return {
      salesToday,
      totalCustomers,
      lowStockItems,
      openOrders,
    };
  }
}
