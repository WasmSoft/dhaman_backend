import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAgreementPolicyDto {
  @ApiProperty({
    required: false,
    type: String,
    nullable: true,
    maxLength: 5000,
    description:
      'Agreement delay policy text. Leave it omitted to preserve the current value or send null to clear it.',
    example:
      'في حال التأخير لأكثر من 3 أيام، يحق للعميل طلب تعديل الجدول الزمني.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  delayPolicy?: string | null;

  @ApiProperty({
    required: false,
    type: String,
    nullable: true,
    maxLength: 5000,
    description:
      'Agreement cancellation policy text. Leave it omitted to preserve the current value or send null to clear it.',
    example: 'يمكن إلغاء الاتفاقية قبل بدء التنفيذ دون رسوم إضافية.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  cancellationPolicy?: string | null;

  @ApiProperty({
    required: false,
    type: String,
    nullable: true,
    maxLength: 5000,
    description:
      'Agreement extra request policy text. Leave it omitted to preserve the current value or send null to clear it.',
    example: 'أي طلب خارج النطاق المتفق عليه يتطلب عرض سعر وموافقة منفصلة.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  extraRequestPolicy?: string | null;

  @ApiProperty({
    required: false,
    type: String,
    nullable: true,
    maxLength: 5000,
    description:
      'Agreement review policy text. Leave it omitted to preserve the current value or send null to clear it.',
    example: 'لدى العميل 7 أيام لمراجعة التسليم وطلب التعديلات المتفق عليها.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reviewPolicy?: string | null;

  @ApiProperty({
    required: false,
    type: Number,
    minimum: 1,
    maximum: 90,
    description: 'Agreement client review period in days, from 1 to 90.',
    example: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  clientReviewPeriodDays?: number;

  @ApiProperty({
    required: false,
    type: Number,
    minimum: 0,
    maximum: 30,
    description:
      'Agreement freelancer delay grace period in days, from 0 to 30.',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  freelancerDelayGraceDays?: number;
}

export class UpdateDefaultPoliciesDto extends UpdateAgreementPolicyDto {}

export class AgreementPolicyResponseDto {
  @ApiProperty({
    type: String,
    description: 'Policy identifier.',
    example: 'pol_123',
  })
  id: string;

  @ApiProperty({
    type: String,
    description: 'Agreement identifier for this policy.',
    example: 'agr_123',
  })
  agreementId: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Agreement policy text describing delay handling.',
    example:
      'في حال التأخير لأكثر من 3 أيام، يحق للعميل طلب تعديل الجدول الزمني.',
  })
  delayPolicy: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Agreement policy text describing cancellation rules.',
    example: null,
  })
  cancellationPolicy: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Agreement policy text describing extra request handling.',
    example: null,
  })
  extraRequestPolicy: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Agreement policy text describing review rules.',
    example: 'لدى العميل 7 أيام لمراجعة التسليم.',
  })
  reviewPolicy: string | null;

  @ApiProperty({
    type: Number,
    minimum: 1,
    maximum: 90,
    description: 'Agreement client review period in days, from 1 to 90.',
    example: 7,
  })
  clientReviewPeriodDays: number;

  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: 30,
    description:
      'Agreement freelancer delay grace period in days, from 0 to 30.',
    example: 3,
  })
  freelancerDelayGraceDays: number;

  @ApiProperty({
    type: String,
    description: 'Creation timestamp (ISO 8601).',
    format: 'date-time',
    example: '2026-04-30T12:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    type: String,
    description: 'Last update timestamp (ISO 8601).',
    format: 'date-time',
    example: '2026-04-30T12:00:00.000Z',
  })
  updatedAt: string;
}

export class DefaultPoliciesResponseDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Default policy text describing delay handling.',
    example: null,
  })
  delayPolicy: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Default policy text describing cancellation rules.',
    example: null,
  })
  cancellationPolicy: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Default policy text describing extra request handling.',
    example: null,
  })
  extraRequestPolicy: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Default policy text describing review rules.',
    example: null,
  })
  reviewPolicy: string | null;

  @ApiProperty({
    type: Number,
    minimum: 1,
    maximum: 90,
    description: 'Default client review period in days, from 1 to 90.',
    example: 7,
  })
  clientReviewPeriodDays: number;

  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: 30,
    description: 'Default freelancer delay grace period in days, from 0 to 30.',
    example: 3,
  })
  freelancerDelayGraceDays: number;
}
