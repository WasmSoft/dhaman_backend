import { ApiProperty } from '@nestjs/swagger';
import { DashboardActionsRequiredResponseDto } from './dashboard-actions-required-response.dto';
import { DashboardOverviewResponseDto } from './dashboard-overview-response.dto';
import { DashboardRecentActivityResponseDto } from './dashboard-recent-activity-response.dto';

export class DashboardApiMetaDto {
  @ApiProperty({ example: 'req_01HZX7N8K2' })
  requestId!: string;
}

export class DashboardOverviewEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: () => DashboardOverviewResponseDto })
  data!: DashboardOverviewResponseDto;

  @ApiProperty({ type: () => DashboardApiMetaDto })
  meta!: DashboardApiMetaDto;
}

export class DashboardActionsRequiredEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: () => DashboardActionsRequiredResponseDto })
  data!: DashboardActionsRequiredResponseDto;

  @ApiProperty({ type: () => DashboardApiMetaDto })
  meta!: DashboardApiMetaDto;
}

export class DashboardRecentActivityEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: () => DashboardRecentActivityResponseDto })
  data!: DashboardRecentActivityResponseDto;

  @ApiProperty({ type: () => DashboardApiMetaDto })
  meta!: DashboardApiMetaDto;
}
