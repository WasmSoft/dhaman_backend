import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class AcceptRecommendationDto {
  @ApiPropertyOptional({
    description:
      'Opt in to creating change request records for out-of-scope items. Defaults are applied later in the service layer.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  createChangeRequests?: boolean;
}
