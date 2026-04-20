import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { Customer } from '@modules/customers/domain/customer.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '@modules/transactions/domain/transaction.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let customerRepository: Partial<Repository<Customer>>;
  let transactionRepository: Partial<Repository<Transaction>> & {
    createQueryBuilder?: jest.Mock;
  };
  let stockLevelRepository: Partial<Repository<StockLevel>>;

  beforeEach(async () => {
    customerRepository = { count: jest.fn() };
    stockLevelRepository = { count: jest.fn() };
    transactionRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Customer),
          useValue: customerRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: transactionRepository,
        },
        {
          provide: getRepositoryToken(StockLevel),
          useValue: stockLevelRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return aggregated stats based on repo responses', async () => {
    (customerRepository.count as jest.Mock).mockResolvedValue(5);
    (stockLevelRepository.count as jest.Mock).mockResolvedValue(2);
    (transactionRepository.count as jest.Mock).mockResolvedValue(7);

    const qbMock = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: '1234.56' }),
    };
    (transactionRepository.createQueryBuilder as jest.Mock).mockReturnValue(
      qbMock,
    );

    const stats = await service.getDashboardStats();
    expect(stats.totalCustomers).toBe(5);
    expect(stats.salesToday).toBe(1234.56);
    expect(stats.lowStockItems).toBe(2);
    expect(stats.openOrders).toBe(7);

    expect(transactionRepository.createQueryBuilder).toHaveBeenCalledWith('t');
    expect(qbMock.where).toHaveBeenCalled();
  });
});
