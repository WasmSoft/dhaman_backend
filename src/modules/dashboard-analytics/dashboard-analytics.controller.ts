import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardOverviewQueryDto } from './dto/dashboard-analytics.dto';
import { DashboardAnalyticsService } from './dashboard-analytics.service';

@ApiTags('Dashboard Analytics')
@Controller('dashboard')
export class DashboardAnalyticsController {
  constructor(
    private readonly dashboardAnalyticsService: DashboardAnalyticsService,
  ) {}

  @Get('overview')
  getOverview(@Query() query: DashboardOverviewQueryDto) {
    return this.dashboardAnalyticsService.getOverview(query);
  }
}
