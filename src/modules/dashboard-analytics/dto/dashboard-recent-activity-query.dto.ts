import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { TimelineEventType } from '../../../common/enums/timeline-event-type.enum';
import { DASHBOARD_MAX_LIST_LIMIT, DASHBOARD_MIN_LIST_LIMIT } from '../types';

export class DashboardRecentActivityQueryDto {
  @ApiPropertyOptional({
    minimum: DASHBOARD_MIN_LIST_LIMIT,
    maximum: DASHBOARD_MAX_LIST_LIMIT,
    example: 10,
    description: 'Maximum number of timeline events to return. Defaults to 10.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(DASHBOARD_MIN_LIST_LIMIT)
  @Max(DASHBOARD_MAX_LIST_LIMIT)
  limit?: number;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '8d1a58a2-e89f-4a21-9b6e-becce6a1e985',
    description:
      'Optional owned agreement filter. Inaccessible agreements return an agreement-not-found error.',
  })
  @IsOptional()
  @IsUUID()
  agreementId?: string;

  @ApiPropertyOptional({
    enum: TimelineEventType,
    example: TimelineEventType.DELIVERY_SUBMITTED,
    description: 'Optional timeline event type filter.',
  })
  @IsOptional()
  @IsEnum(TimelineEventType)
  type?: TimelineEventType;
}
