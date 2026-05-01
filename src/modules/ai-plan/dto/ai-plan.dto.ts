import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class GeneratePlanDto {
  @ApiProperty({
    description:
      'وصف المشروع الحر بالعربية أو الإنجليزية / Free-text project description in AR or EN',
    example: 'تصميم متجر إلكتروني مع بوابة دفع ولوحة إدارة',
    minLength: 20,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  projectDescription!: string;

  @ApiPropertyOptional({
    description: 'لغة المخرجات المفضلة / Preferred output language',
    example: 'ar',
    enum: ['ar', 'en'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['ar', 'en'])
  language?: 'ar' | 'en';

  @ApiPropertyOptional({
    description: 'الميزانية الإجمالية التقديرية / Optional total budget hint',
    example: 12000,
    minimum: 100,
    maximum: 1000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(1000000)
  totalBudget?: number;

  @ApiPropertyOptional({
    description: 'رمز العملة / Currency code',
    example: 'SAR',
  })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class GeneratePlanForAgreementDto {
  @ApiPropertyOptional({
    description:
      'وصف المشروع (يُكمّل أو يتجاوز وصف الاتفاقية) / Project description override or supplement',
    example: 'تطوير صفحة هبوط وربطها بنظام التحليلات',
    minLength: 20,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  projectDescription?: string;

  @ApiPropertyOptional({
    description: 'لغة المخرجات المفضلة / Preferred output language',
    example: 'ar',
    enum: ['ar', 'en'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['ar', 'en'])
  language?: 'ar' | 'en';
}

export class GenerateAgreementDraftDto {
  @ApiPropertyOptional({
    description: 'اسم المشروع الحالي / Current project title',
    example: 'تصميم صفحة هبوط لشركة ناشئة',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  projectTitle?: string;

  @ApiPropertyOptional({
    description: 'وصف المشروع الحالي / Current project description',
    example: 'تصميم صفحة هبوط متجاوبة مع نسخة Desktop وMobile',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  projectDescription?: string;

  @ApiPropertyOptional({
    description: 'اسم العميل / Client name',
    example: 'شركة المدار',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientName?: string;

  @ApiPropertyOptional({
    description: 'نوع الخدمة / Service category',
    example: 'تصميم واجهات',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceType?: string;

  @ApiPropertyOptional({
    description: 'مدة التنفيذ الحالية / Current duration text',
    example: '14 يوم',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  durationText?: string;

  @ApiPropertyOptional({
    description: 'تاريخ التسليم المتوقع / Expected delivery date',
    example: '2026-07-01',
  })
  @IsOptional()
  @IsString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({
    description: 'لغة المخرجات / Output language',
    example: 'ar',
    enum: ['ar', 'en'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['ar', 'en'])
  language?: 'ar' | 'en';

  @ApiPropertyOptional({
    description: 'الميزانية التقديرية / Total budget hint',
    example: 5000,
    minimum: 100,
    maximum: 1000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(1000000)
  totalBudget?: number;

  @ApiPropertyOptional({
    description: 'رمز العملة / Currency code',
    example: 'SAR',
  })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class GeneratedMilestoneDto {
  @ApiProperty({
    description: 'عنوان المرحلة / Milestone title',
    example: 'مرحلة التصميم الأولي',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: 'مبلغ الدفعة / Payment amount',
    example: 4800,
  })
  @IsNumber()
  amount!: number;

  @ApiProperty({
    description: 'عدد الأيام حتى الاستحقاق / Days until due',
    example: 7,
  })
  @IsNumber()
  dueInDays!: number;

  @ApiProperty({
    description: 'معايير قبول التسليم / Acceptance criteria',
    example: ['تسليم التصاميم الرئيسية', 'موافقة العميل على الهوية البصرية'],
    isArray: true,
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  acceptanceCriteria!: string[];

  @ApiProperty({
    description: 'الحد الأقصى للمراجعات / Revision limit',
    example: 2,
  })
  @IsNumber()
  revisionLimit!: number;
}

export class GeneratedPoliciesDto {
  @ApiProperty({
    description: 'سياسة التأخير / Delay policy',
    nullable: true,
    example: 'يتم تمديد الموعد فقط عند موافقة الطرفين كتابياً.',
  })
  @IsString()
  @IsNotEmpty()
  delayPolicy!: string | null;

  @ApiProperty({
    description: 'سياسة الإلغاء / Cancellation policy',
    nullable: true,
    example: 'تستحق المبالغ الخاصة بالمراحل المقبولة قبل الإلغاء.',
  })
  @IsString()
  @IsNotEmpty()
  cancellationPolicy!: string | null;

  @ApiProperty({
    description: 'سياسة الطلبات الإضافية / Extra request policy',
    nullable: true,
    example: 'أي طلب خارج النطاق يحتاج عرض تكلفة منفصل.',
  })
  @IsString()
  @IsNotEmpty()
  extraRequestPolicy!: string | null;

  @ApiProperty({
    description: 'سياسة المراجعة / Review policy',
    nullable: true,
    example: 'للعميل جولتا مراجعة لكل مرحلة قبل الاعتماد النهائي.',
  })
  @IsString()
  @IsNotEmpty()
  reviewPolicy!: string | null;
}

export class GeneratedPlanResponseDto {
  @ApiProperty({
    description: 'معرف مسودة الخطة / Draft identifier',
    example: 'clx123aiPlanDraft',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    description: 'المراحل المجدولة / Generated milestones',
    type: [GeneratedMilestoneDto],
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedMilestoneDto)
  milestones!: GeneratedMilestoneDto[];

  @ApiProperty({
    description: 'السياسات المُنشأة / Generated policies',
    type: GeneratedPoliciesDto,
  })
  @ValidateNested()
  @Type(() => GeneratedPoliciesDto)
  policies!: GeneratedPoliciesDto;

  @ApiProperty({
    description: 'تحذيرات الغموض في وصف المشروع / Ambiguity warnings',
    example: ['مدة المشروع غير محددة بوضوح'],
    isArray: true,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  ambiguityWarnings!: string[];

  @ApiProperty({
    description: 'درجة وضوح المشروع من 0 إلى 100 / Clarity score 0-100',
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  clarityScore!: number;
}

export class GeneratedAgreementDraftResponseDto extends GeneratedPlanResponseDto {
  @ApiProperty({
    description: 'عنوان الاتفاق المقترح / Suggested agreement title',
    example: 'اتفاق تصميم صفحة هبوط لشركة ناشئة',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: 'وصف الاتفاق المقترح / Suggested agreement description',
    example: 'تصميم صفحة هبوط متجاوبة مع مخرجات واضحة وجدول دفع مرحلي.',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({
    description: 'نوع الخدمة المقترح / Suggested service type',
    example: 'تصميم واجهات',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  serviceType?: string | null;

  @ApiPropertyOptional({
    description: 'المدة المقترحة / Suggested duration text',
    example: '14 يوم',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  durationText?: string | null;

  @ApiPropertyOptional({
    description: 'تاريخ التسليم المقترح / Suggested expected delivery date',
    example: '2026-07-01',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  expectedDeliveryDate?: string | null;

  @ApiProperty({
    description: 'رمز العملة المقترح / Suggested currency code',
    example: 'SAR',
  })
  @IsString()
  @IsNotEmpty()
  currency!: string;
}
