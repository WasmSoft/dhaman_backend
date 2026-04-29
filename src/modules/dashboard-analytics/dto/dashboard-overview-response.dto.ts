import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DASHBOARD_RANGE_VALUES, type DashboardRange } from '../types';

export class DashboardMetricCardDto {
  @ApiProperty({ example: 'protected_amount' })
  key!: string;

  @ApiProperty({ example: 'Protected amount' })
  label!: string;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: '1250.00' },
      { type: 'integer', example: 3 },
    ],
  })
  value!: string | number;

  @ApiProperty({ enum: ['count', 'money', 'percentage'], example: 'money' })
  valueType!: 'count' | 'money' | 'percentage';

  @ApiPropertyOptional({ example: 'USD', nullable: true })
  currency?: string | null;

  @ApiPropertyOptional({ example: 'RESERVED', nullable: true })
  status?: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  trend?: string | null;
}

export class DashboardPaymentSummaryDto {
  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: '1250.00' })
  protectedAmount!: string;

  @ApiProperty({ example: '750.00' })
  releasedAmount!: string;

  @ApiProperty({ example: '500.00' })
  pendingAmount!: string;

  @ApiProperty({ example: '250.00' })
  readyToReleaseAmount!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { RESERVED: '1250.00', RELEASED: '750.00' },
  })
  byStatus!: Record<string, string>;
}

export class DashboardAgreementSummaryDto {
  @ApiProperty({ example: 8 })
  total!: number;

  @ApiProperty({ example: 3 })
  active!: number;

  @ApiProperty({ example: 2 })
  completed!: number;

  @ApiProperty({ example: 0 })
  disputed!: number;

  @ApiProperty({ example: 3 })
  draftOrSent!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'integer' },
    example: { ACTIVE: 3, COMPLETED: 2, DRAFT: 1, SENT: 2 },
  })
  byStatus!: Record<string, number>;
}

export class DashboardCountSummaryDto {
  @ApiProperty({ example: 5 })
  total!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'integer' },
    example: { COMPLETED: 3, PENDING: 2 },
  })
  byStatus!: Record<string, number>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'integer' },
    example: { ACCEPT: 2, NEEDS_HUMAN_REVIEW: 1 },
  })
  byRecommendation?: Record<string, number>;
}

export class DashboardMoneyAndCountSummaryDto {
  @ApiProperty({ example: 2 })
  total!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'integer' },
    example: { PENDING: 1, APPROVED: 1 },
  })
  byStatus!: Record<string, number>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { USD: '300.00' },
  })
  amountsByCurrency?: Record<string, string>;
}

export class DashboardOverviewResponseDto {
  @ApiProperty({ enum: DASHBOARD_RANGE_VALUES, example: '30d' })
  range!: DashboardRange;

  @ApiPropertyOptional({ example: 'USD', nullable: true })
  currency?: string | null;

  @ApiProperty({ type: () => DashboardMetricCardDto, isArray: true })
  metrics!: DashboardMetricCardDto[];

  @ApiProperty({ type: () => DashboardPaymentSummaryDto, isArray: true })
  paymentSummary!: DashboardPaymentSummaryDto[];

  @ApiProperty({ type: () => DashboardAgreementSummaryDto })
  agreementSummary!: DashboardAgreementSummaryDto;

  @ApiProperty({ type: () => DashboardCountSummaryDto })
  aiReviewSummary!: DashboardCountSummaryDto;

  @ApiProperty({ type: () => DashboardMoneyAndCountSummaryDto })
  changeRequestSummary!: DashboardMoneyAndCountSummaryDto;

  @ApiProperty({ example: '2026-04-29T12:00:00.000Z' })
  generatedAt!: string;
}
