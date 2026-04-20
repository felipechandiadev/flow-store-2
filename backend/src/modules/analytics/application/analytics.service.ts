import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, LessThan } from 'typeorm';
import { DashboardStats } from '../domain/dashboard-stats';
import { Customer } from '@modules/customers/domain/customer.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '@modules/transactions/domain/transaction.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(StockLevel)
    private readonly stockLevelRepository: Repository<StockLevel>,
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    return this.computeStats();
  }

  /**
   * Core implementation, shared by both dashboard and report endpoints.
   */
  private async computeStats(): Promise<DashboardStats> {
    // count active customers
    const totalCustomers = await this.customerRepository.count({
      where: { isActive: true },
    });

    // sum sales for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const raw = await this.transactionRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.total),0)', 'sum')
      .where('t.transactionType = :sale', { sale: TransactionType.SALE })
      .andWhere('t.createdAt >= :today', { today: todayStart })
      .getRawOne();

    const salesToday = Number(raw?.sum || 0);

    // items with low available stock (< threshold)
    const threshold = 10;
    // Use FindOptions with LessThan helper to avoid raw SQL string in `where`
    const lowStockItems = await this.stockLevelRepository.count({
      where: { availableStock: LessThan(threshold) },
    });

    // open purchase orders (not cancelled)
    const openOrders = await this.transactionRepository.count({
      where: {
        transactionType: TransactionType.PURCHASE_ORDER,
        status: Not(TransactionStatus.CANCELLED),
      },
    });

    return { salesToday, totalCustomers, lowStockItems, openOrders };
  }
}
