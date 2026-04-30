import { ApiProperty } from '@nestjs/swagger';

const AI_STRICTNESS_VALUES = ['lenient', 'balanced', 'strict'] as const;

export class SettingsResponseDto {
  @ApiProperty({
    description: 'Settings record unique identifier.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'User ID that owns this settings record.',
    example: 'c9f1e2a3-4b5c-6d7e-8f9a-0b1c2d3e4f5a',
  })
  userId: string;

  @ApiProperty({
    description: 'Default currency used for future agreements.',
    example: 'USD',
  })
  defaultCurrency: string;

  @ApiProperty({
    description: 'Default service type used to prefill future agreements.',
    example: 'Logo Design',
    nullable: true,
  })
  defaultServiceType: string | null;

  @ApiProperty({
    description: 'Default delay policy copied into future agreements.',
    example:
      'Late delivery beyond 3 days requires notice and revised timeline approval.',
    nullable: true,
  })
  defaultDelayPolicy: string | null;

  @ApiProperty({
    description: 'Default cancellation policy copied into future agreements.',
    example:
      'Cancellation after project start keeps payment for completed work only.',
    nullable: true,
  })
  defaultCancellationPolicy: string | null;

  @ApiProperty({
    description: 'Default extra request policy copied into future agreements.',
    example:
      'Requests outside the approved scope require a separate agreement update.',
    nullable: true,
  })
  defaultExtraRequestPolicy: string | null;

  @ApiProperty({
    description: 'Default review policy copied into future agreements.',
    example:
      'The client has 3 business days to review each submitted deliverable.',
    nullable: true,
  })
  defaultReviewPolicy: string | null;

  @ApiProperty({
    description: 'AI strictness preference used for future plan generation.',
    example: 'balanced',
    enum: AI_STRICTNESS_VALUES,
  })
  aiStrictness: string;

  @ApiProperty({
    description: 'Whether email notifications are enabled for the freelancer.',
    example: true,
  })
  emailNotificationsEnabled: boolean;

  @ApiProperty({
    description: 'Settings creation timestamp.',
    example: '2026-04-30T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Settings last update timestamp.',
    example: '2026-04-30T10:15:00.000Z',
  })
  updatedAt: string;
}

export class DefaultPoliciesResponseDto {
  @ApiProperty({
    description: 'Default delay policy copied into future agreements.',
    example:
      'Late delivery beyond 3 days requires notice and revised timeline approval.',
    nullable: true,
  })
  defaultDelayPolicy: string | null;

  @ApiProperty({
    description: 'Default cancellation policy copied into future agreements.',
    example:
      'Cancellation after project start keeps payment for completed work only.',
    nullable: true,
  })
  defaultCancellationPolicy: string | null;

  @ApiProperty({
    description: 'Default extra request policy copied into future agreements.',
    example:
      'Requests outside the approved scope require a separate agreement update.',
    nullable: true,
  })
  defaultExtraRequestPolicy: string | null;

  @ApiProperty({
    description: 'Default review policy copied into future agreements.',
    example:
      'The client has 3 business days to review each submitted deliverable.',
    nullable: true,
  })
  defaultReviewPolicy: string | null;
}
