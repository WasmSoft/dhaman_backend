import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardActionRequiredDto {
  @ApiProperty({ example: 'action_payment_123' })
  id!: string;

  @ApiProperty({
    enum: ['payments', 'deliveries', 'ai_reviews', 'change_requests'],
    example: 'payments',
  })
  type!: 'payments' | 'deliveries' | 'ai_reviews' | 'change_requests';

  @ApiProperty({ example: 'Payment ready to release' })
  title!: string;

  @ApiProperty({
    example:
      'Review the completed milestone and release the protected payment.',
  })
  description!: string;

  @ApiProperty({
    example: '8d1a58a2-e89f-4a21-9b6e-becce6a1e985',
    format: 'uuid',
  })
  agreementId!: string;

  @ApiPropertyOptional({ example: 'Landing page redesign', nullable: true })
  agreementTitle?: string | null;

  @ApiProperty({ example: '44f8b0c8-3d35-4fc2-b7df-a7660d824afe' })
  sourceId!: string;

  @ApiProperty({ example: 'READY_TO_RELEASE' })
  sourceStatus!: string;

  @ApiPropertyOptional({ example: '250.00', nullable: true })
  amount?: string | null;

  @ApiPropertyOptional({ example: 'USD', nullable: true })
  currency?: string | null;

  @ApiProperty({ example: '2026-04-29T11:00:00.000Z' })
  createdAt!: string;

  @ApiPropertyOptional({ enum: ['normal', 'high', 'urgent'], nullable: true })
  priority?: 'normal' | 'high' | 'urgent' | null;
}

export class DashboardActionsRequiredResponseDto {
  @ApiProperty({ type: () => DashboardActionRequiredDto, isArray: true })
  items!: DashboardActionRequiredDto[];
}
