import { ApiProperty } from '@nestjs/swagger';
import {
  AIRecommendation,
  AIReviewStatus,
  TimelineActorRole,
} from '@prisma/client';

export class AiReviewResponseDto {
  @ApiProperty({
    description: 'AI review identifier in UUID v4 format.',
    example: '31ddf8a4-cb55-4d38-b91b-9cdd15f0b7f1',
  })
  id!: string;

  @ApiProperty({
    description: 'Agreement identifier in UUID v4 format.',
    example: 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f',
  })
  agreementId!: string;

  @ApiProperty({
    description: 'Milestone identifier in UUID v4 format.',
    example: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
  })
  milestoneId!: string;

  @ApiProperty({
    description: 'Delivery identifier in UUID v4 format.',
    example: '0fed4321-09bc-4654-8210-fedcba987654',
  })
  deliveryId!: string;

  @ApiProperty({
    description: 'Current AI review lifecycle status.',
    enum: AIReviewStatus,
    example: AIReviewStatus.COMPLETED,
  })
  status!: AIReviewStatus;

  @ApiProperty({
    description: 'Delivery-to-criteria match score from 0 to 100 when available.',
    example: 72,
    nullable: true,
  })
  matchScore!: number | null;

  @ApiProperty({
    description: 'AI recommendation when available.',
    enum: AIRecommendation,
    example: AIRecommendation.PARTIAL,
    nullable: true,
  })
  recommendation!: AIRecommendation | null;

  @ApiProperty({
    description:
      'AI reasoning text. Example shown in Arabic for the default locale.',
    example:
      'يحقق التسليم 4 من أصل 5 من معايير القبول. القسم المتعلق بمعرض الأعمال غير مكتمل، ويوصى بقبول جزئي.',
    nullable: true,
  })
  reasoning!: string | null;

  @ApiProperty({
    description: 'Acceptance criteria the delivery satisfied.',
    example: ['تصميم متجاوب', 'ألوان الهوية'],
    type: [String],
    nullable: true,
  })
  completedCriteria!: string[] | null;

  @ApiProperty({
    description: 'Acceptance criteria the delivery did not satisfy.',
    example: ['قسم معرض الأعمال على الجوال'],
    type: [String],
    nullable: true,
  })
  missingCriteria!: string[] | null;

  @ApiProperty({
    description: 'Items the AI identified as outside the original scope.',
    example: ['إضافة نظام تسجيل الدخول'],
    type: [String],
    nullable: true,
  })
  outOfScopeItems!: string[] | null;

  @ApiProperty({
    description:
      'Original objection text provided when the AI review was opened.',
    example:
      'الموقع لا يطابق التصميم المطلوب: الترويسة بألوان مختلفة، وقسم "معرض الأعمال" غير ظاهر على الجوال.',
  })
  objection!: string;

  @ApiProperty({
    description: 'Actor role that requested the AI review.',
    enum: TimelineActorRole,
    example: TimelineActorRole.CLIENT,
  })
  requestedByRole!: TimelineActorRole;

  @ApiProperty({
    description: 'Creation timestamp in ISO 8601 format.',
    example: '2026-04-29T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp in ISO 8601 format.',
    example: '2026-04-29T12:05:00.000Z',
  })
  updatedAt!: Date;
}
