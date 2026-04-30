import {
  ChangeRequestStatus,
  PaymentOperationType,
  PaymentStatus,
  TimelineActorRole,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentSummaryDto {
  @ApiProperty({ description: 'Payment identifier' })
  id!: string;

  @ApiProperty({ enum: PaymentStatus, description: 'Payment status' })
  status!: PaymentStatus;

  @ApiProperty({
    description: 'Amount in Decimal-safe string format',
    example: '500.00',
  })
  amount!: string;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency!: string;

  @ApiProperty({
    enum: PaymentOperationType,
    description: 'Payment operation type',
  })
  operationType!: PaymentOperationType;
}

export class ChangeRequestResponseDto {
  @ApiProperty({ description: 'Change request identifier' })
  id!: string;

  @ApiProperty({ description: 'Agreement identifier' })
  agreementId!: string;

  @ApiPropertyOptional({ description: 'Associated milestone UUID' })
  milestoneId!: string | null;

  @ApiPropertyOptional({
    description: 'AI review UUID that triggered this request',
  })
  aiReviewId!: string | null;

  @ApiProperty({
    enum: TimelineActorRole,
    description: 'Role that requested this change',
  })
  requestedByRole!: TimelineActorRole;

  @ApiProperty({ description: 'Brief title for the change request' })
  title!: string;

  @ApiProperty({ description: 'Detailed description of extra work' })
  description!: string;

  @ApiProperty({
    description: 'Extra work price as Decimal-safe string',
    example: '500.00',
  })
  amount!: string;

  @ApiProperty({
    description: 'ISO 4217 currency code (uppercase)',
    example: 'USD',
  })
  currency!: string;

  @ApiPropertyOptional({ description: 'Human-readable timeline note' })
  additionalTimelineText!: string | null;

  @ApiPropertyOptional({ description: 'Estimated duration in days' })
  timelineDays!: number | null;

  @ApiProperty({
    description: 'Non-empty list of acceptance criteria strings',
    isArray: true,
    type: String,
  })
  acceptanceCriteria!: string[];

  @ApiProperty({
    enum: ChangeRequestStatus,
    description: 'Change request status',
  })
  status!: ChangeRequestStatus;

  @ApiProperty({ enum: PaymentStatus, description: 'Payment status' })
  paymentStatus!: PaymentStatus;

  @ApiPropertyOptional({ description: 'Approval timestamp (ISO 8601)' })
  approvedAt!: string | null;

  @ApiPropertyOptional({ description: 'Decline timestamp (ISO 8601)' })
  declinedAt!: string | null;

  @ApiPropertyOptional({ description: 'Funded timestamp (ISO 8601)' })
  fundedAt!: string | null;

  @ApiProperty({ description: 'Creation timestamp (ISO 8601)' })
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp (ISO 8601)' })
  updatedAt!: string;

  @ApiProperty({
    description: 'Related payments',
    type: [PaymentSummaryDto],
  })
  payments!: PaymentSummaryDto[];
}

export class ChangeRequestListItemDto {
  @ApiProperty({ description: 'Change request identifier' })
  id!: string;

  @ApiProperty({ description: 'Agreement identifier' })
  agreementId!: string;

  @ApiPropertyOptional({ description: 'Associated milestone UUID' })
  milestoneId!: string | null;

  @ApiProperty({ description: 'Brief title for the change request' })
  title!: string;

  @ApiProperty({
    description: 'Extra work price as Decimal-safe string',
    example: '500.00',
  })
  amount!: string;

  @ApiProperty({
    description: 'ISO 4217 currency code (uppercase)',
    example: 'USD',
  })
  currency!: string;

  @ApiProperty({
    enum: ChangeRequestStatus,
    description: 'Change request status',
  })
  status!: ChangeRequestStatus;

  @ApiProperty({ enum: PaymentStatus, description: 'Payment status' })
  paymentStatus!: PaymentStatus;

  @ApiProperty({ description: 'Creation timestamp (ISO 8601)' })
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp (ISO 8601)' })
  updatedAt!: string;
}
