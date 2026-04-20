import { QueryBus } from '@nestjs/cqrs';
import { AnalyticsServiceAdapter } from '@modules/analytics/application/analytics.service.adapter';
import { GetDashboardStatsQuery } from '@modules/analytics/application/queries/get-dashboard-stats.query';

describe('AnalyticsServiceAdapter', () => {
  let service: AnalyticsServiceAdapter;
  let queryBus: { execute: jest.Mock };

  beforeEach(() => {
    queryBus = { execute: jest.fn() };

    service = new AnalyticsServiceAdapter(queryBus as unknown as QueryBus);
  });

  it('should dispatch GetDashboardStatsQuery', async () => {
    queryBus.execute.mockResolvedValueOnce({
      salesToday: 100,
      totalCustomers: 20,
      lowStockItems: 3,
      openOrders: 4,
    });

    const result = await service.getDashboardStats();

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetDashboardStatsQuery);
    expect(result).toEqual({
      salesToday: 100,
      totalCustomers: 20,
      lowStockItems: 3,
      openOrders: 4,
    });
  });
});