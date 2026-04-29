import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ALLOWED_CURRENCIES } from './agreement-currency.constants';

export class UpdateAgreementDto {
  @ApiProperty({
    description: 'Updated agreement title',
    example: 'تصميم وتطوير موقع إلكتروني',
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({
    description: 'Updated description',
    maxLength: 5000,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({
    description: 'Updated service type',
    maxLength: 100,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceType?: string;

  @ApiProperty({
    description: 'ID of the client to link or re-link',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({
    description: 'Total agreement amount — must equal sum of milestone amounts',
    example: 5000,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiProperty({
    description: 'Currency code',
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
    example: '6 أسابيع',
    maxLength: 100,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  durationText?: string;

  @ApiProperty({
    description: 'Updated target completion date — ISO 8601',
    example: '2026-08-15',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;
}
