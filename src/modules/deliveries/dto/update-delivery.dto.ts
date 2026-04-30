import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateDeliveryDto {
  @ApiPropertyOptional({
    description: 'Updated public delivery evidence URL / تحديث رابط التسليم العام',
    example: 'https://example.com/deliveries/revision-2-preview',
  })
  @IsOptional()
  @IsUrl()
  deliveryUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated uploaded file URL / تحديث رابط ملف التسليم',
    example: 'https://cdn.example.com/files/logo-package-v2.zip',
  })
  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated file name / تحديث اسم الملف',
    example: 'logo-package-v2.zip',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional({
    description: 'Updated file type / تحديث نوع الملف',
    example: 'application/zip',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fileType?: string;

  @ApiPropertyOptional({
    description: 'Updated delivery summary / تحديث ملخص التسليم',
    example: 'Updated assets and fixed the mobile spacing issue.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  summary?: string;

  @ApiPropertyOptional({
    description: 'Updated optional notes / تحديث الملاحظات الاختيارية',
    example: 'Added the alternate Arabic header version.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
