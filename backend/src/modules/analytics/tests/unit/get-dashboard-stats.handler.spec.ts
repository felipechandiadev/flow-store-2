import { Test, TestingModule } from '@nestjs/testing';
import { GetDashboardStatsQueryHandler } from '@modules/analytics/application/handlers/queries/get-dashboard-stats.handler';
import { GetDashboardStatsQuery } from '@modules/analytics/application/queries/get-dashboard-stats.query';
import { AnalyticsRepositoryPort } from '@modules/analytics/application/ports/analytics.repository.port';

describe('GetDashboardStatsQueryHandler', () => {
  let handler: GetDashboardStatsQueryHandler;
  let repository: jest.Mocked<AnalyticsRepositoryPort>;

  beforeEach(async () => {
    repository = {
      getDashboardStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetDashboardStatsQueryHandler,
        {
          provide: 'AnalyticsRepositoryPort',
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetDashboardStatsQueryHandler);
  });

  it('should return dashboard stats from repository', async () => {
    repository.getDashboardStats.mockResolvedValueOnce({
      salesToday: 150,
      totalCustomers: 30,
      lowStockItems: 2,
      openOrders: 6,
    });

    const result = await handler.execute(new GetDashboardStatsQuery());

    expect(repository.getDashboardStats).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      salesToday: 150,
      totalCustomers: 30,
      lowStockItems: 2,
      openOrders: 6,
    });
  });
});