import { ApiPropertyOptional } from '@nestjs/swagger';
import { AIReviewStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class GetAiReviewsQueryDto {
  @ApiPropertyOptional({
    description: 'Optional agreement filter in UUID v4 format.',
    example: 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f',
  })
  @IsOptional()
  @IsUUID('4')
  agreementId?: string;

  @ApiPropertyOptional({
    description: 'Optional AI review status filter.',
    enum: AIReviewStatus,
    example: AIReviewStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(AIReviewStatus)
  status?: AIReviewStatus;

  @ApiPropertyOptional({
    description: 'Optional page number. Defaults to 1 when omitted.',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description:
      'Optional page size. Defaults to 20 when omitted and is capped at 50.',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
