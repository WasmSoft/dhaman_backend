import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDeliveryDto {
  @ApiPropertyOptional({
    description: 'Public delivery evidence URL / رابط التسليم العام',
    example: 'https://example.com/deliveries/final-preview',
  })
  @IsOptional()
  @IsUrl()
  deliveryUrl?: string;

  @ApiPropertyOptional({
    description: 'Uploaded file URL / رابط ملف التسليم',
    example: 'https://cdn.example.com/files/logo-package.zip',
  })
  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @ApiPropertyOptional({
    description: 'Original delivery file name / اسم ملف التسليم',
    example: 'logo-package.zip',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional({
    description: 'Delivery file MIME type or label / نوع ملف التسليم',
    example: 'application/zip',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fileType?: string;

  @ApiProperty({
    description: 'Delivery summary shown to the client / ملخص التسليم',
    example:
      'Completed the homepage redesign, responsive navigation, and exported final assets.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  summary!: string;

  @ApiPropertyOptional({
    description: 'Optional extra notes / ملاحظات إضافية اختيارية',
    example: 'Source files are included in the ZIP archive.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
