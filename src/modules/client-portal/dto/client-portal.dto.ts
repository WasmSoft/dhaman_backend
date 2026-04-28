import { IsOptional, IsString } from 'class-validator';

export class PortalActionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
