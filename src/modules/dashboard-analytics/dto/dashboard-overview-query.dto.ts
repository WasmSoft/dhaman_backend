import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { DASHBOARD_RANGE_VALUES, type DashboardRange } from '../types';

export class DashboardOverviewQueryDto {
  @ApiPropertyOptional({
    enum: DASHBOARD_RANGE_VALUES,
    example: '30d',
    description: 'Dashboard date range. Defaults to 30d when omitted.',
  })
  @IsOptional()
  @IsIn(DASHBOARD_RANGE_VALUES)
  range?: DashboardRange;

  @ApiPropertyOptional({
    example: 'USD',
    description:
      'Optional three-character display or filter currency. No conversion is performed.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
