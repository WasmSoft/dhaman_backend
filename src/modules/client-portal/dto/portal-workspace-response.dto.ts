import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  PortalMilestoneSummaryDto,
  PortalPaymentScheduleItemDto,
} from './portal-invite-response.dto';

export class PortalDeliverySummaryDto {
  @ApiProperty({ description: 'Delivery identifier' })
  id!: string;

  @ApiProperty({ description: 'Milestone identifier' })
  milestoneId!: string;

  @ApiProperty({ description: 'Milestone title', example: 'Logo design' })
  milestoneTitle!: string;

  @ApiProperty({ description: 'Delivery status', example: 'SUBMITTED' })
  status!: string;

  @ApiPropertyOptional({
    description: 'Submitted timestamp in ISO 8601 format',
  })
  submittedAt?: string;

  @ApiPropertyOptional({ description: 'Delivery notes' })
  notes?: string;
}

export class PortalChangeRequestSummaryDto {
  @ApiProperty({ description: 'Change request identifier' })
  id!: string;

  @ApiProperty({ description: 'Change request status', example: 'SENT' })
  status!: string;

  @ApiProperty({ description: 'Change request title' })
  title!: string;

  @ApiProperty({ description: 'Change request description' })
  description!: string;

  @ApiPropertyOptional({
    description: 'Requested amount as Decimal-safe string',
    example: '500.00',
  })
  requestedAmount?: string;

  @ApiProperty({ description: 'Creation timestamp in ISO 8601 format' })
  createdAt!: string;
}

export class PortalAiReviewSummaryDto {
  @ApiProperty({ description: 'AI review identifier' })
  id!: string;

  @ApiProperty({ description: 'AI review status', example: 'COMPLETED' })
  status!: string;

  @ApiPropertyOptional({ description: 'Client-safe summary of AI conclusion' })
  conclusion?: string;

  @ApiProperty({ description: 'Creation timestamp in ISO 8601 format' })
  createdAt!: string;
}

export class PortalTimelineEventDto {
  @ApiProperty({ description: 'Timeline event identifier' })
  id!: string;

  @ApiProperty({ description: 'Event type', example: 'AGREEMENT_APPROVED' })
  eventType!: string;

  @ApiProperty({ description: 'Actor role', example: 'CLIENT' })
  actorRole!: string;

  @ApiPropertyOptional({ description: 'Human-readable event description' })
  description?: string;

  @ApiProperty({ description: 'Event timestamp in ISO 8601 format' })
  occurredAt!: string;
}

export class PortalWorkspaceResponseDto {
  @ApiProperty({ description: 'Agreement identifier' })
  agreementId!: string;

  @ApiProperty({
    description: 'Agreement title',
    example: 'Brand Identity Design',
  })
  title!: string;

  @ApiProperty({ description: 'Agreement status', example: 'ACTIVE' })
  status!: string;

  @ApiProperty({
    description: 'Total amount as Decimal-safe string',
    example: '5000.00',
  })
  totalAmount!: string;

  @ApiProperty({ description: 'Currency code', example: 'SAR' })
  currency!: string;

  @ApiProperty({
    description: 'Freelancer display name',
    example: 'Ahmed Hassan',
  })
  freelancerName!: string;

  @ApiProperty({
    description: 'Milestones list',
    type: [PortalMilestoneSummaryDto],
  })
  @Type(() => PortalMilestoneSummaryDto)
  milestones!: PortalMilestoneSummaryDto[];

  @ApiProperty({
    description: 'Payments list',
    type: [PortalPaymentScheduleItemDto],
  })
  @Type(() => PortalPaymentScheduleItemDto)
  payments!: PortalPaymentScheduleItemDto[];

  @ApiProperty({
    description: 'Deliveries list',
    type: [PortalDeliverySummaryDto],
  })
  @Type(() => PortalDeliverySummaryDto)
  deliveries!: PortalDeliverySummaryDto[];

  @ApiProperty({
    description: 'Change requests list',
    type: [PortalChangeRequestSummaryDto],
  })
  @Type(() => PortalChangeRequestSummaryDto)
  changeRequests!: PortalChangeRequestSummaryDto[];

  @ApiProperty({
    description: 'AI reviews list',
    type: [PortalAiReviewSummaryDto],
  })
  @Type(() => PortalAiReviewSummaryDto)
  aiReviews!: PortalAiReviewSummaryDto[];

  @ApiProperty({
    description: 'Timeline events list',
    type: [PortalTimelineEventDto],
  })
  @Type(() => PortalTimelineEventDto)
  timeline!: PortalTimelineEventDto[];
}
