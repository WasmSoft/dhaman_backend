import { IsOptional, IsString } from 'class-validator';

export class DashboardOverviewQueryDto {
  @IsOptional()
  @IsString()
  range?: string;
}
