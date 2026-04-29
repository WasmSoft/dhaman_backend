import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ALLOWED_CURRENCIES } from './agreement-currency.constants';

export class CreateAgreementDto {
  @ApiProperty({
    description: 'Agreement title — required, must not be blank',
    example: 'تصميم موقع إلكتروني',
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the service scope',
    example: 'تطوير موقع إلكتروني متجاوب بخمس صفحات',
    maxLength: 5000,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({
    description: 'Category of service',
    example: 'تطوير الويب',
    maxLength: 100,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceType?: string;

  @ApiProperty({
    description: 'ID of an existing client record to link at creation time',
    example: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({
    description: 'Currency code — must be one of the supported values',
    example: 'SAR',
    enum: ALLOWED_CURRENCIES,
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_CURRENCIES)
  currency?: string;

  @ApiProperty({
    description: 'Human-readable project duration',
    example: '4 أسابيع',
    maxLength: 100,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  durationText?: string;

  @ApiProperty({
    description: 'Target completion date — ISO 8601 date string',
    example: '2026-07-01',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;
}
