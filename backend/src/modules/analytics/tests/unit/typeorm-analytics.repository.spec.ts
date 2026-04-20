import { LessThan, Not } from 'typeorm';
import { TypeOrmAnalyticsRepository } from '@modules/analytics/infrastructure/repositories/typeorm-analytics.repository';
import {
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';

describe('TypeOrmAnalyticsRepository', () => {
  let repository: TypeOrmAnalyticsRepository;
  let customerRepository: { count: jest.Mock };
  let transactionRepository: { count: jest.Mock; createQueryBuilder: jest.Mock };
  let stockLevelRepository: { count: jest.Mock };
  let queryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getRawOne: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };

    customerRepository = { count: jest.fn() };
    transactionRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    stockLevelRepository = { count: jest.fn() };

    repository = new TypeOrmAnalyticsRepository(
      customerRepository as any,
      transactionRepository as any,
      stockLevelRepository as any,
    );
  });

  it('should aggregate dashboard stats', async () => {
    customerRepository.count.mockResolvedValueOnce(15);
    queryBuilder.getRawOne.mockResolvedValueOnce({ sum: '2450' });
    stockLevelRepository.count.mockResolvedValueOnce(4);
    transactionRepository.count.mockResolvedValueOnce(7);

    const result = await repository.getDashboardStats();

    expect(customerRepository.count).toHaveBeenCalledWith({ where: { isActive: true } });
    expect(transactionRepository.createQueryBuilder).toHaveBeenCalledWith('t');
    expect(queryBuilder.where).toHaveBeenCalledWith('t.transactionType = :sale', {
      sale: TransactionType.SALE,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('t.createdAt >= :today', {
      today: expect.any(Date),
    });
    expect(stockLevelRepository.count).toHaveBeenCalledWith({
      where: { availableStock: LessThan(10) },
    });
    expect(transactionRepository.count).toHaveBeenCalledWith({
      where: {
        transactionType: TransactionType.PURCHASE_ORDER,
        status: Not(TransactionStatus.CANCELLED),
      },
    });
    expect(result).toEqual({
      salesToday: 2450,
      totalCustomers: 15,
      lowStockItems: 4,
      openOrders: 7,
    });
  });

  it('should default salesToday to zero when aggregate returns null', async () => {
    customerRepository.count.mockResolvedValueOnce(0);
    queryBuilder.getRawOne.mockResolvedValueOnce(null);
    stockLevelRepository.count.mockResolvedValueOnce(0);
    transactionRepository.count.mockResolvedValueOnce(0);

    const result = await repository.getDashboardStats();

    expect(result.salesToday).toBe(0);
  });
});