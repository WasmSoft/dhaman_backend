import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  DASHBOARD_ACTION_TYPE_VALUES,
  DASHBOARD_MAX_LIST_LIMIT,
  DASHBOARD_MIN_LIST_LIMIT,
  type DashboardActionType,
} from '../types';

export class DashboardActionsQueryDto {
  @ApiPropertyOptional({
    minimum: DASHBOARD_MIN_LIST_LIMIT,
    maximum: DASHBOARD_MAX_LIST_LIMIT,
    example: 10,
    description: 'Maximum number of action items to return. Defaults to 10.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(DASHBOARD_MIN_LIST_LIMIT)
  @Max(DASHBOARD_MAX_LIST_LIMIT)
  limit?: number;

  @ApiPropertyOptional({
    enum: DASHBOARD_ACTION_TYPE_VALUES,
    example: 'all',
    description: 'Optional action category filter. Defaults to all.',
  })
  @IsOptional()
  @IsIn(DASHBOARD_ACTION_TYPE_VALUES)
  type?: DashboardActionType;
}
