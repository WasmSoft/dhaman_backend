import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RequestDeliveryChangesDto {
  @ApiProperty({
    description: 'Reason the client is requesting changes / سبب طلب التعديلات',
    example:
      'The mobile navigation and portfolio section still need adjustment before approval.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;

  @ApiPropertyOptional({
    description:
      'Optional acceptance criteria labels that need changes / معايير القبول التي تحتاج تعديل',
    example: ['Mobile navigation', 'Portfolio section'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  requestedCriteria?: string[];
}
