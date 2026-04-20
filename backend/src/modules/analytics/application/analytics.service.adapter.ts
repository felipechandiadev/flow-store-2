import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetDashboardStatsQuery } from './queries/get-dashboard-stats.query';
import { DashboardStats } from '../domain/dashboard-stats';

@Injectable()
export class AnalyticsServiceAdapter {
  constructor(private readonly queryBus: QueryBus) {}

  async getDashboardStats(): Promise<DashboardStats> {
    return this.queryBus.execute(new GetDashboardStatsQuery());
  }
}
