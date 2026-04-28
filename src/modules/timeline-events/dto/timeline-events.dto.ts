import { IsOptional, IsUUID } from 'class-validator';

export class TimelineQueryDto {
  @IsOptional()
  @IsUUID()
  milestoneId?: string;
}
