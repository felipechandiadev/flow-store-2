import { DashboardStats } from '../../domain/dashboard-stats';

export abstract class AnalyticsRepositoryPort {
  abstract getDashboardStats(): Promise<DashboardStats>;
}
