import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import {
  DASHBOARD_OVERVIEW_POPULATED_EXAMPLE,
  DASHBOARD_ACTIONS_REQUIRED_POPULATED_EXAMPLE,
  DASHBOARD_RECENT_ACTIVITY_POPULATED_EXAMPLE,
  DASHBOARD_RANGE_INVALID_ERROR_EXAMPLE,
  DASHBOARD_UNAUTHORIZED_ERROR_EXAMPLE,
  DASHBOARD_VALIDATION_ERROR_EXAMPLE,
  DASHBOARD_AGREEMENT_NOT_FOUND_ERROR_EXAMPLE,
  DASHBOARD_AGGREGATION_ERROR_EXAMPLE,
  DashboardAgreementSummaryDto,
  DashboardActionRequiredDto,
  DashboardActionsQueryDto,
  DashboardActionsRequiredEnvelopeDto,
  DashboardActionsRequiredResponseDto,
  DashboardCountSummaryDto,
  DashboardMetricCardDto,
  DashboardMoneyAndCountSummaryDto,
  DashboardOverviewEnvelopeDto,
  DashboardOverviewQueryDto,
  DashboardOverviewResponseDto,
  DashboardPaymentSummaryDto,
  DashboardRecentActivityDto,
  DashboardRecentActivityEnvelopeDto,
  DashboardRecentActivityQueryDto,
  DashboardRecentActivityResponseDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TimelineEventType } from '../../common/enums/timeline-event-type.enum';
import { DashboardAnalyticsService } from './dashboard-analytics.service';

@ApiTags('Dashboard Analytics')
@ApiExtraModels(
  DashboardOverviewEnvelopeDto,
  DashboardActionsRequiredEnvelopeDto,
  DashboardRecentActivityEnvelopeDto,
  DashboardOverviewResponseDto,
  DashboardActionsRequiredResponseDto,
  DashboardRecentActivityResponseDto,
  DashboardMetricCardDto,
  DashboardPaymentSummaryDto,
  DashboardAgreementSummaryDto,
  DashboardCountSummaryDto,
  DashboardMoneyAndCountSummaryDto,
  DashboardActionRequiredDto,
  DashboardRecentActivityDto,
  ErrorResponseDto,
)
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardAnalyticsController {
  constructor(
    private readonly dashboardAnalyticsService: DashboardAnalyticsService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get freelancer dashboard overview',
    description:
      'Returns read-only dashboard overview metrics scoped to the authenticated freelancer. Money values are exact strings and no currency conversion is performed.',
  })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', 'all'],
    description: 'Dashboard date range. Defaults to 30d when omitted.',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    example: 'USD',
    description:
      'Optional three-character display or filter currency. No conversion is performed.',
  })
  @ApiOkResponse({
    description: 'Dashboard overview returned.',
    schema: {
      allOf: [{ $ref: getSchemaPath(DashboardOverviewEnvelopeDto) }],
      example: DASHBOARD_OVERVIEW_POPULATED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid dashboard range.',
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: DASHBOARD_RANGE_INVALID_ERROR_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: DASHBOARD_UNAUTHORIZED_ERROR_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Dashboard analytics could not be calculated.',
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: DASHBOARD_AGGREGATION_ERROR_EXAMPLE,
    },
  })
  @Get('overview')
  getOverview(@Query() query: DashboardOverviewQueryDto) {
    return this.dashboardAnalyticsService.getOverview(query);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get freelancer dashboard actions required',
    description:
      'Returns read-only items needing freelancer attention, scoped to the authenticated freelancer. Money values are exact strings and no business transitions are performed.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    minimum: 1,
    maximum: 50,
    example: 10,
    description: 'Maximum number of action items to return. Defaults to 10.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['payments', 'deliveries', 'ai_reviews', 'change_requests', 'all'],
    description: 'Optional action category filter. Defaults to all.',
  })
  @ApiOkResponse({
    description: 'Dashboard action-required items returned.',
    schema: {
      allOf: [{ $ref: getSchemaPath(DashboardActionsRequiredEnvelopeDto) }],
      example: DASHBOARD_ACTIONS_REQUIRED_POPULATED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: DASHBOARD_VALIDATION_ERROR_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: DASHBOARD_UNAUTHORIZED_ERROR_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Dashboard analytics could not be calculated.',
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: DASHBOARD_AGGREGATION_ERROR_EXAMPLE,
    },
  })
  @Get('actions-required')
  getActionsRequired(@Query() query: DashboardActionsQueryDto) {
    return this.dashboardAnalyticsService.getActionsRequired(query);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get freelancer dashboard recent activity',
    description:
      'Returns recent timeline activity for agreements owned by the authenticated freelancer. Optional agreement filters are ownership-checked before activity is returned.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    minimum: 1,
    maximum: 50,
    example: 10,
    description: 'Maximum number of timeline events to return. Defaults to 10.',
  })
  @ApiQuery({
    name: 'agreementId',
    required: false,
    format: 'uuid',
    description:
      'Optional owned agreement filter. Inaccessible agreements return AGREEMENT_NOT_FOUND.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: TimelineEventType,
    description: 'Optional timeline event type filter.',
  })
  @ApiOkResponse({
    description: 'Dashboard recent activity returned.',
    schema: {
      allOf: [{ $ref: getSchemaPath(DashboardRecentActivityEnvelopeDto) }],
      example: DASHBOARD_RECENT_ACTIVITY_POPULATED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: DASHBOARD_VALIDATION_ERROR_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: DASHBOARD_UNAUTHORIZED_ERROR_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Agreement was not found or is not owned by the freelancer.',
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: DASHBOARD_AGREEMENT_NOT_FOUND_ERROR_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Dashboard analytics could not be calculated.',
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: DASHBOARD_AGGREGATION_ERROR_EXAMPLE,
    },
  })
  @Get('recent-activity')
  getRecentActivity(@Query() query: DashboardRecentActivityQueryDto) {
    return this.dashboardAnalyticsService.getRecentActivity(query);
  }
}
