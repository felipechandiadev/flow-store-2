import { Controller, Get } from '@nestjs/common';
import { AnalyticsServiceAdapter } from '../application/analytics.service.adapter';
import { DashboardStats } from '../domain/dashboard-stats';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsServiceAdapter) {}

  @Get('dashboard')
  async dashboard(): Promise<DashboardStats> {
    return this.analyticsService.getDashboardStats();
  }

  // for future reporting features we expose an explicit "report" endpoint; for
  // now it simply returns the same numbers as the dashboard but can be
  // extended later to include CSV/Excel exports or more detailed data.
  @Get('report')
  async report(): Promise<DashboardStats> {
    return this.analyticsService.getDashboardStats();
  }
}
