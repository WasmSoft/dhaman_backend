import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { DeliveryStatus } from '../../../common/enums/delivery-status.enum';
import { MilestoneStatus } from '../../../common/enums/milestone-status.enum';

const PAYMENT_STATUS_VALUES = [
  'WAITING',
  'RESERVED',
  'CLIENT_REVIEW',
  'AI_REVIEW',
  'READY_TO_RELEASE',
  'RELEASED',
  'ON_HOLD',
  'FAILED',
  'REFUNDED',
  'NOT_REQUIRED',
] as const;

export class DeliveryMilestoneSummaryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-4890-9234-567890abcdef' })
  id!: string;

  @ApiProperty({ example: 'Brand identity delivery' })
  title!: string;

  @ApiProperty({ enum: MilestoneStatus, example: MilestoneStatus.ACTIVE })
  status!: MilestoneStatus;

  @ApiProperty({
    enum: PAYMENT_STATUS_VALUES,
    example: 'CLIENT_REVIEW',
    description: 'Current milestone payment status / حالة دفع المرحلة',
  })
  paymentStatus!: string;

  @ApiProperty({
    enum: DeliveryStatus,
    example: DeliveryStatus.SUBMITTED,
    description: 'Current milestone delivery status / حالة تسليم المرحلة',
  })
  deliveryStatus!: DeliveryStatus;

  @ApiProperty({ example: 3, description: 'Allowed revision rounds / عدد جولات التعديل' })
  revisionLimit!: number;
}

export class DeliveryPaymentSummaryDto {
  @ApiProperty({
    enum: PAYMENT_STATUS_VALUES,
    example: 'CLIENT_REVIEW',
    description: 'Related payment status / حالة الدفعة المرتبطة',
  })
  status!: string;

  @ApiProperty({ example: true, description: 'Whether this is a demo payment / هل الدفعة تجريبية' })
  demoMode!: boolean;

  @ApiPropertyOptional({
    example: '2026-04-29T10:00:00.000Z',
    nullable: true,
    description: 'Reserved timestamp / وقت الحجز',
  })
  reservedAt?: string | null;

  @ApiPropertyOptional({
    example: '2026-04-30T08:30:00.000Z',
    nullable: true,
    description: 'Released timestamp / وقت الصرف',
  })
  releasedAt?: string | null;
}

export class DeliveryTimelineReferenceDto {
  @ApiProperty({
    example: 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f',
    description: 'Agreement identifier used for related timeline lookups / معرف الاتفاق',
  })
  agreementId!: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
    nullable: true,
    description: 'Milestone identifier used for related timeline lookups / معرف المرحلة',
  })
  milestoneId?: string | null;
}

export class DeliveryResponseDto {
  @ApiProperty({ example: '0fed4321-09bc-4654-8210-fedcba987654' })
  id!: string;

  @ApiProperty({ example: 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f' })
  agreementId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-4890-9234-567890abcdef' })
  milestoneId!: string;

  @ApiProperty({ example: '8d996a40-72f5-4f45-93e1-60ff2278a9f2' })
  submittedById!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/deliveries/final-preview',
    nullable: true,
  })
  deliveryUrl?: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/files/logo-package.zip',
    nullable: true,
  })
  fileUrl?: string | null;

  @ApiPropertyOptional({ example: 'logo-package.zip', nullable: true })
  fileName?: string | null;

  @ApiPropertyOptional({ example: 'application/zip', nullable: true })
  fileType?: string | null;

  @ApiProperty({
    example:
      'Completed the homepage redesign, responsive navigation, and exported final assets.',
  })
  summary!: string;

  @ApiPropertyOptional({
    example: 'Source files are included in the ZIP archive.',
    nullable: true,
  })
  notes?: string | null;

  @ApiProperty({ enum: DeliveryStatus, example: DeliveryStatus.SUBMITTED })
  status!: DeliveryStatus;

  @ApiPropertyOptional({ example: '2026-04-29T12:00:00.000Z', nullable: true })
  submittedAt?: string | null;

  @ApiPropertyOptional({ example: '2026-04-30T08:00:00.000Z', nullable: true })
  acceptedAt?: string | null;

  @ApiPropertyOptional({ example: '2026-04-30T06:00:00.000Z', nullable: true })
  changesRequestedAt?: string | null;

  @ApiPropertyOptional({
    example: 'The mobile navigation still overlaps the header.',
    nullable: true,
  })
  clientFeedback?: string | null;

  @ApiProperty({ type: () => DeliveryMilestoneSummaryDto })
  @ValidateNested()
  @Type(() => DeliveryMilestoneSummaryDto)
  milestone!: DeliveryMilestoneSummaryDto;

  @ApiPropertyOptional({ type: () => DeliveryPaymentSummaryDto, nullable: true })
  @ValidateNested()
  @Type(() => DeliveryPaymentSummaryDto)
  payment?: DeliveryPaymentSummaryDto | null;

  @ApiProperty({ type: () => DeliveryTimelineReferenceDto })
  @ValidateNested()
  @Type(() => DeliveryTimelineReferenceDto)
  timeline!: DeliveryTimelineReferenceDto;

  @ApiProperty({ example: '2026-04-29T09:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-29T12:00:00.000Z' })
  updatedAt!: string;
}

export class DeliveryListResponseDto {
  @ApiProperty({ type: () => DeliveryResponseDto, isArray: true })
  @ValidateNested({ each: true })
  @Type(() => DeliveryResponseDto)
  deliveries!: DeliveryResponseDto[];

  @ApiProperty({
    example: 1,
    description: 'Current page number / رقم الصفحة الحالي',
  })
  page!: number;

  @ApiProperty({
    example: 20,
    description: 'Current page size / حجم الصفحة الحالي',
  })
  limit!: number;

  @ApiProperty({
    example: 4,
    description: 'Total matching deliveries / إجمالي عدد التسليمات',
  })
  total!: number;
}
