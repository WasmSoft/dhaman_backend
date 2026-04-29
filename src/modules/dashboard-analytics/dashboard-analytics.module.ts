import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DashboardAnalyticsController } from './dashboard-analytics.controller';
import { DashboardAnalyticsService } from './dashboard-analytics.service';

@Module({
  controllers: [DashboardAnalyticsController],
  providers: [DashboardAnalyticsService, JwtAuthGuard],
})
export class DashboardAnalyticsModule {}
