import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PortalActionResponseDto {
  @ApiProperty({
    description: 'Agreement identifier the action was performed on',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  agreementId!: string;

  @ApiProperty({
    description: 'Resulting agreement status after the action',
    example: 'APPROVED',
  })
  status!: string;

  @ApiProperty({
    description: 'Human-readable confirmation message',
    example: 'Agreement approved successfully.',
  })
  message!: string;

  @ApiPropertyOptional({
    description: 'Timeline event identifier created by this action',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  timelineEventId?: string;
}
