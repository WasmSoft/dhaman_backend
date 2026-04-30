import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimelineActorRole, TimelineEventType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class TimelineQueryDto {
  @ApiPropertyOptional({
    description: 'Filter timeline events by event type.',
    enum: TimelineEventType,
    example: TimelineEventType.DELIVERY_SUBMITTED,
  })
  @IsOptional()
  @IsEnum(TimelineEventType)
  type?: TimelineEventType;

  @ApiPropertyOptional({
    description: 'Filter timeline events by milestone UUID.',
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
  })
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @ApiPropertyOptional({
    description: 'Filter timeline events by actor role.',
    enum: TimelineActorRole,
    example: TimelineActorRole.CLIENT,
  })
  @IsOptional()
  @IsEnum(TimelineActorRole)
  actorRole?: TimelineActorRole;

  @ApiPropertyOptional({
    description: 'Lower bound for createdAt in ISO 8601 format.',
    format: 'date-time',
    example: '2026-04-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Upper bound for createdAt in ISO 8601 format.',
    format: 'date-time',
    example: '2026-04-30T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Page number. Defaults to 1.',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Page size. Defaults to 20, maximum 100.',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
