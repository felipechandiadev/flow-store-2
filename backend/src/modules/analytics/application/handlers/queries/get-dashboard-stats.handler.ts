import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetDashboardStatsQuery } from '../../queries/get-dashboard-stats.query';
import { AnalyticsRepositoryPort } from '../../ports/analytics.repository.port';
import { DashboardStats } from '../../../domain/dashboard-stats';

@QueryHandler(GetDashboardStatsQuery)
export class GetDashboardStatsQueryHandler
  implements IQueryHandler<GetDashboardStatsQuery>
{
  constructor(
    @Inject('AnalyticsRepositoryPort')
    private readonly analyticsRepository: AnalyticsRepositoryPort,
  ) {}

  async execute(_query: GetDashboardStatsQuery): Promise<DashboardStats> {
    return this.analyticsRepository.getDashboardStats();
  }
}
