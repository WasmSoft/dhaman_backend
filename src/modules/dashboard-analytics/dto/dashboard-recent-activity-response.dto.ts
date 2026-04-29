import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimelineActorRole } from '../../../common/enums/timeline-actor-role.enum';
import { TimelineEventType } from '../../../common/enums/timeline-event-type.enum';

export class DashboardRecentActivityDto {
  @ApiProperty({
    example: '3c27f53a-839a-4e2b-aa3e-76883ed3a535',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    example: '8d1a58a2-e89f-4a21-9b6e-becce6a1e985',
    format: 'uuid',
  })
  agreementId!: string;

  @ApiPropertyOptional({ example: 'Landing page redesign', nullable: true })
  agreementTitle?: string | null;

  @ApiProperty({
    enum: TimelineEventType,
    example: TimelineEventType.DELIVERY_SUBMITTED,
  })
  type!: TimelineEventType;

  @ApiProperty({ example: 'Delivery submitted' })
  title!: string;

  @ApiProperty({
    example: 'The freelancer submitted milestone delivery for review.',
  })
  description!: string;

  @ApiProperty({
    enum: TimelineActorRole,
    example: TimelineActorRole.FREELANCER,
  })
  actorRole!: TimelineActorRole;

  @ApiProperty({ example: '2026-04-29T10:30:00.000Z' })
  createdAt!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { milestoneId: '91a8a2fa-23dc-47aa-b284-fb6e751ce47b' },
  })
  metadata?: Record<string, unknown> | null;
}

export class DashboardRecentActivityResponseDto {
  @ApiProperty({ type: () => DashboardRecentActivityDto, isArray: true })
  items!: DashboardRecentActivityDto[];
}
