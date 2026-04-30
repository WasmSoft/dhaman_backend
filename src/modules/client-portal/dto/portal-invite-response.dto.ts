import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PortalInviteFreelancerDto {
  @ApiProperty({ description: 'Freelancer display name', example: 'Ahmed Hassan' })
  name!: string;
}

export class PortalInviteClientDto {
  @ApiProperty({ description: 'Client display name', example: 'Sara Al-Rashid' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Client email (shown only if client has consented)',
    example: 'sara@example.com',
  })
  email?: string;
}

export class PortalPolicySummaryDto {
  @ApiProperty({ description: 'Review period in days', example: 3 })
  reviewPeriodDays!: number;

  @ApiProperty({ description: 'Maximum revision count', example: 2 })
  revisionLimit!: number;

  @ApiPropertyOptional({
    description: 'Late delivery penalty percentage',
    example: 5,
  })
  lateDeliveryPenaltyPercent?: number;

  @ApiPropertyOptional({
    description: 'Early delivery bonus percentage',
    example: null,
  })
  earlyDeliveryBonusPercent?: number | null;
}

export class PortalMilestoneSummaryDto {
  @ApiProperty({ description: 'Milestone identifier' })
  id!: string;

  @ApiProperty({ description: 'Display order', example: 1 })
  order!: number;

  @ApiProperty({ description: 'Milestone title', example: 'Logo design' })
  title!: string;

  @ApiPropertyOptional({ description: 'Milestone description' })
  description?: string;

  @ApiProperty({ description: 'Amount as Decimal-safe string', example: '2500.00' })
  amount!: string;

  @ApiProperty({ description: 'Currency code', example: 'SAR' })
  currency!: string;

  @ApiProperty({ description: 'Milestone status', example: 'PENDING' })
  status!: string;

  @ApiPropertyOptional({ description: 'Due date in ISO 8601 format' })
  dueDate?: string;
}

export class PortalPaymentScheduleItemDto {
  @ApiProperty({ description: 'Milestone identifier' })
  milestoneId!: string;

  @ApiProperty({ description: 'Milestone title', example: 'Logo design' })
  milestoneTitle!: string;

  @ApiProperty({ description: 'Payment amount as Decimal-safe string', example: '2500.00' })
  amount!: string;

  @ApiProperty({ description: 'Currency code', example: 'SAR' })
  currency!: string;

  @ApiProperty({ description: 'Payment status', example: 'WAITING' })
  status!: string;
}

export class PortalInviteResponseDto {
  @ApiProperty({ description: 'Agreement identifier' })
  agreementId!: string;

  @ApiProperty({ description: 'Agreement title', example: 'Brand Identity Design' })
  title!: string;

  @ApiProperty({ description: 'Agreement description' })
  description!: string;

  @ApiProperty({ description: 'Service type', example: 'Graphic Design' })
  serviceType!: string;

  @ApiProperty({ description: 'Total amount as Decimal-safe string', example: '5000.00' })
  totalAmount!: string;

  @ApiProperty({ description: 'Currency code', example: 'SAR' })
  currency!: string;

  @ApiPropertyOptional({ description: 'Expected delivery date in ISO 8601 format' })
  expectedDeliveryDate?: string;

  @ApiProperty({ description: 'Agreement status', example: 'SENT' })
  status!: string;

  @ApiPropertyOptional({ description: 'Sent timestamp in ISO 8601 format' })
  sentAt?: string;

  @ApiProperty({ description: 'Freelancer summary', type: PortalInviteFreelancerDto })
  @Type(() => PortalInviteFreelancerDto)
  freelancer!: PortalInviteFreelancerDto;

  @ApiProperty({ description: 'Client summary', type: PortalInviteClientDto })
  @Type(() => PortalInviteClientDto)
  client!: PortalInviteClientDto;

  @ApiPropertyOptional({ description: 'Policy summary', type: PortalPolicySummaryDto })
  @Type(() => PortalPolicySummaryDto)
  policy?: PortalPolicySummaryDto;

  @ApiProperty({ description: 'Milestone list', type: [PortalMilestoneSummaryDto] })
  @Type(() => PortalMilestoneSummaryDto)
  milestones!: PortalMilestoneSummaryDto[];

  @ApiProperty({ description: 'Payment schedule', type: [PortalPaymentScheduleItemDto] })
  @Type(() => PortalPaymentScheduleItemDto)
  paymentSchedule!: PortalPaymentScheduleItemDto[];
}
