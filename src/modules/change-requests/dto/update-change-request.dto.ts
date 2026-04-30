import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const DECIMAL_SAFE_PATTERN = /^\d+(\.\d{1,2})?$/;

export class UpdateChangeRequestDto {
  @ApiPropertyOptional({
    description: 'Brief title for the change request',
    example: 'Add extra landing page',
    minLength: 3,
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of extra work',
    example:
      'Client needs an additional landing page with hero section and contact form.',
    minLength: 10,
    maxLength: 3000,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(3000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Extra work price as Decimal-safe string',
    example: '500.00',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(DECIMAL_SAFE_PATTERN, {
    message:
      'Amount must be a valid Decimal-safe string (digits with up to 2 decimal places)',
  })
  amount?: string;

  @ApiPropertyOptional({
    description: 'ISO 4217 currency code (uppercase)',
    example: 'USD',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a 3-letter uppercase ISO code',
  })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Estimated duration in days',
    example: 7,
    minimum: 1,
    maximum: 3650,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  timelineDays?: number;

  @ApiPropertyOptional({
    description: 'Human-readable timeline note',
    example: 'Requires 1 week extra',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalTimelineText?: string;

  @ApiPropertyOptional({
    description: 'Non-empty list of acceptance criteria strings',
    example: ['Homepage hero updated', 'CTA button visible above fold'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  acceptanceCriteria?: string[];
}
