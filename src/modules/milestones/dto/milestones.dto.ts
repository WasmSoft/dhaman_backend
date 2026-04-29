import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DeliveryStatus } from '../../../common/enums/delivery-status.enum';
import { MilestoneStatus } from '../../../common/enums/milestone-status.enum';

const DECIMAL_AMOUNT_REGEX = /^(?!0+(?:\.0{1,2})?$)\d+(?:\.\d{1,2})?$/;

export class AcceptanceCriterionDto {
  @ApiProperty({
    description: 'Acceptance criterion description / وصف شرط القبول',
    example: 'Logo delivered in SVG format',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({
    description: 'Whether this criterion is required / هل الشرط إلزامي',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class CreateMilestoneDto {
  @ApiProperty({
    description: 'Milestone title / عنوان المرحلة',
    example: 'Brand identity delivery',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({
    description: 'Milestone description / وصف المرحلة',
    example: 'Initial logo and brand files',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description:
      'Decimal-safe milestone amount / مبلغ المرحلة بصيغة عشرية آمنة',
    example: '2500.00',
  })
  @IsString()
  @Matches(DECIMAL_AMOUNT_REGEX, {
    message:
      'amount must be a positive decimal string with up to 2 decimal places',
  })
  amount!: string;

  @ApiPropertyOptional({
    description: 'Expected milestone due date / تاريخ التسليم المتوقع للمرحلة',
    example: '2026-05-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({
    description: 'Public milestone order index / ترتيب المرحلة في العقد',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  orderIndex!: number;

  @ApiProperty({
    description: 'Acceptance criteria list / قائمة شروط القبول',
    example: [{ description: 'Logo delivered in SVG format', required: true }],
    type: () => [AcceptanceCriterionDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AcceptanceCriterionDto)
  acceptanceCriteria!: AcceptanceCriterionDto[];

  @ApiPropertyOptional({
    description: 'Allowed revision rounds / عدد جولات التعديل المسموح',
    example: 3,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  revisionLimit?: number;
}

export class UpdateMilestoneDto {
  @ApiPropertyOptional({
    description: 'Milestone title / عنوان المرحلة',
    example: 'Updated brand identity delivery',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({
    description: 'Milestone description / وصف المرحلة',
    example: 'Updated delivery description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Decimal-safe milestone amount / مبلغ المرحلة بصيغة عشرية آمنة',
    example: '2750.00',
  })
  @IsOptional()
  @IsString()
  @Matches(DECIMAL_AMOUNT_REGEX, {
    message:
      'amount must be a positive decimal string with up to 2 decimal places',
  })
  amount?: string;

  @ApiPropertyOptional({
    description: 'Expected milestone due date / تاريخ التسليم المتوقع للمرحلة',
    example: '2026-05-20T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Acceptance criteria list / قائمة شروط القبول',
    example: [
      { description: 'Logo and source files delivered', required: true },
    ],
    type: () => [AcceptanceCriterionDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AcceptanceCriterionDto)
  acceptanceCriteria?: AcceptanceCriterionDto[];

  @ApiPropertyOptional({
    description: 'Allowed revision rounds / عدد جولات التعديل المسموح',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  revisionLimit?: number;
}

export class MilestoneOrderItemDto {
  @ApiProperty({
    description: 'Milestone ID / معرف المرحلة',
    example: '8d996a40-72f5-4f45-93e1-60ff2278a9f2',
  })
  @IsUUID()
  milestoneId!: string;

  @ApiProperty({
    description: 'New public order index / الترتيب الجديد للمرحلة',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  orderIndex!: number;
}

export class ReorderMilestonesDto {
  @ApiProperty({
    description: 'Full milestone reorder list / قائمة إعادة ترتيب كل المراحل',
    example: [
      { milestoneId: '8d996a40-72f5-4f45-93e1-60ff2278a9f2', orderIndex: 1 },
      { milestoneId: '4be8349b-6ba6-4afc-a8ea-9b856d5c5445', orderIndex: 2 },
    ],
    type: () => [MilestoneOrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MilestoneOrderItemDto)
  milestones!: MilestoneOrderItemDto[];
}

export class MilestoneResponseDto {
  @ApiProperty({ example: '8d996a40-72f5-4f45-93e1-60ff2278a9f2' })
  id!: string;

  @ApiProperty({ example: '47bd65fb-786a-46b9-bf78-2da9ed37d6d7' })
  agreementId!: string;

  @ApiProperty({ example: 'Brand identity delivery' })
  title!: string;

  @ApiProperty({ example: 'Initial logo and brand files', nullable: true })
  description!: string | null;

  @ApiProperty({ example: '2500.00' })
  amount!: string;

  @ApiProperty({ example: 'SAR' })
  currency!: string;

  @ApiProperty({ example: '2026-05-15T00:00:00.000Z', nullable: true })
  dueDate!: string | null;

  @ApiProperty({ example: 1 })
  orderIndex!: number;

  @ApiProperty({ enum: MilestoneStatus, example: MilestoneStatus.DRAFT })
  status!: MilestoneStatus;

  @ApiProperty({
    enum: ['WAITING', 'RESERVED', 'CLIENT_REVIEW', 'RELEASED'],
    example: 'WAITING',
  })
  paymentStatus!: string;

  @ApiProperty({ enum: DeliveryStatus, example: DeliveryStatus.NOT_SUBMITTED })
  deliveryStatus!: DeliveryStatus;

  @ApiProperty({
    type: () => [AcceptanceCriterionDto],
    example: [{ description: 'Logo delivered in SVG format', required: true }],
  })
  acceptanceCriteria!: AcceptanceCriterionDto[];

  @ApiProperty({ example: 3 })
  revisionLimit!: number;

  @ApiProperty({ example: '2026-04-29T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-29T00:00:00.000Z' })
  updatedAt!: string;
}

export class MilestoneListResponseDto {
  @ApiProperty({ example: [], type: () => [MilestoneResponseDto] })
  milestones!: MilestoneResponseDto[];

  @ApiProperty({ example: '0.00' })
  totalAmount!: string;

  @ApiProperty({ example: '7500.00' })
  agreementTotalAmount!: string;

  @ApiProperty({ example: false })
  amountMatch!: boolean;

  @ApiProperty({ example: 'SAR' })
  currency!: string;
}

export class MilestoneMutationResponseDto {
  @ApiProperty({ type: () => MilestoneResponseDto })
  data!: MilestoneResponseDto;

  @ApiPropertyOptional({
    description:
      'Optional amount mismatch warning / تحذير اختياري عند اختلاف المبلغ',
    example: 'Milestone total does not match agreement total',
  })
  amountWarning?: string;
}

export class MilestoneArrayResponseDto {
  @ApiProperty({ type: () => [MilestoneResponseDto] })
  data!: MilestoneResponseDto[];
}

export class DeleteMilestoneResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}
