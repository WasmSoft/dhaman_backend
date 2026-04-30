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
    description: 'Policy text describing how freelancer delays are handled.',
    example: 'في حال التأخير لأكثر من 3 أيام، يحق للعميل طلب تعديل الجدول الزمني.',
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
    description: 'Policy text describing cancellation rules.',
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
    description: 'Policy text describing out-of-scope or extra requests.',
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
    description: 'Policy text describing client review and revision expectations.',
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
    description: 'Number of days the client has to review a deliverable.',
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
    description: 'Number of grace days before freelancer delay rules apply.',
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
    description: 'Policy text describing delay handling.',
    example: 'في حال التأخير لأكثر من 3 أيام، يحق للعميل طلب تعديل الجدول الزمني.',
  })
  delayPolicy: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Policy text describing cancellation rules.',
    example: null,
  })
  cancellationPolicy: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Policy text describing extra request handling.',
    example: null,
  })
  extraRequestPolicy: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Policy text describing review rules.',
    example: 'لدى العميل 7 أيام لمراجعة التسليم.',
  })
  reviewPolicy: string | null;

  @ApiProperty({
    type: Number,
    minimum: 1,
    maximum: 90,
    description: 'Number of days the client has to review a deliverable.',
    example: 7,
  })
  clientReviewPeriodDays: number;

  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: 30,
    description: 'Number of grace days before delay rules apply.',
    example: 3,
  })
  freelancerDelayGraceDays: number;

  @ApiProperty({
    type: String,
    description: 'Creation timestamp (ISO 8601).',
    example: '2026-04-30T12:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    type: String,
    description: 'Last update timestamp (ISO 8601).',
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
    description: 'Default review period in days.',
    example: 7,
  })
  clientReviewPeriodDays: number;

  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: 30,
    description: 'Default grace period in days.',
    example: 3,
  })
  freelancerDelayGraceDays: number;
}
