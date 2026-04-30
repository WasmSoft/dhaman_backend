import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimelineActorRole, TimelineEventType } from '@prisma/client';

export class TimelineEventResponseDto {
  @ApiProperty({
    description: 'Timeline event identifier.',
    format: 'uuid',
    example: '31ddf8a4-cb55-4d38-b91b-9cdd15f0b7f1',
  })
  id!: string;

  @ApiProperty({
    description: 'Agreement identifier this event belongs to.',
    format: 'uuid',
    example: 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f',
  })
  agreementId!: string;

  @ApiProperty({
    description: 'Milestone identifier when the event is milestone-specific.',
    format: 'uuid',
    nullable: true,
    example: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
  })
  milestoneId!: string | null;

  @ApiProperty({
    description: 'Role responsible for the event.',
    enum: TimelineActorRole,
    example: TimelineActorRole.CLIENT,
  })
  actorRole!: TimelineActorRole;

  @ApiPropertyOptional({
    description: 'Display name for the actor when safe to expose.',
    example: 'Sara Client',
  })
  actorName?: string;

  @ApiProperty({
    description: 'Timeline event classification.',
    enum: TimelineEventType,
    example: TimelineEventType.PAYMENT_RESERVED,
  })
  type!: TimelineEventType;

  @ApiProperty({
    description: 'Short human-readable event title.',
    example: 'Payment reserved',
  })
  title!: string;

  @ApiProperty({
    description: 'Human-readable event description.',
    example: 'Client reserved payment for the homepage milestone.',
  })
  description!: string;

  @ApiProperty({
    description:
      'Structured event evidence containing business identifiers, status transitions, ' +
      'and user-facing evidence details. Portal responses must be client-safe and must not ' +
      'expose raw portal tokens, password hashes, provider secrets, full sensitive AI prompts, ' +
      'or private internal implementation details.',
    nullable: true,
    type: 'object',
    additionalProperties: true,
    example: {
      amount: '1500.00',
      currency: 'SAR',
      milestoneTitle: 'Homepage delivery',
    },
  })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Creation timestamp in ISO 8601 format.',
    format: 'date-time',
    example: '2026-04-29T12:00:00.000Z',
  })
  createdAt!: string;
}

export class PaginatedTimelineEventsResponseDto {
  @ApiProperty({
    description: 'Timeline events for the current page.',
    type: () => TimelineEventResponseDto,
    isArray: true,
  })
  items!: TimelineEventResponseDto[];

  @ApiProperty({
    description: 'Current page number.',
    minimum: 1,
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Page size used.',
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total matching timeline event count.',
    minimum: 0,
    example: 42,
  })
  total!: number;

  @ApiProperty({
    description:
      'Whether additional matching results are available beyond the current page.',
    example: true,
  })
  hasNextPage!: boolean;
}
