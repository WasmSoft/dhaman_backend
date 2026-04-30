import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { DeliveryStatus } from '../../../common/enums/delivery-status.enum';

export class DeliveryQueryDto {
  @ApiPropertyOptional({
    description: 'Optional agreement filter / فلتر الاتفاق الاختياري',
    example: 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  agreementId?: string;

  @ApiPropertyOptional({
    description: 'Optional milestone filter / فلتر المرحلة الاختياري',
    example: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @ApiPropertyOptional({
    description: 'Optional delivery status filter / فلتر حالة التسليم',
    enum: DeliveryStatus,
    example: DeliveryStatus.CHANGES_REQUESTED,
  })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @ApiPropertyOptional({
    description: 'Page number starting from 1 / رقم الصفحة',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Page size capped at 100 / حجم الصفحة',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
