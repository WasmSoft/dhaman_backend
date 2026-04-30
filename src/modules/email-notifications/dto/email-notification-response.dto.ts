import { ApiProperty } from '@nestjs/swagger';
import { NotificationStatus, NotificationType } from '@prisma/client';

export class EmailNotificationResponseDto {
  @ApiProperty({
    description: 'Notification record ID.',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  id!: string;

  @ApiProperty({
    description: 'Agreement ID when scoped to an agreement, otherwise null.',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  agreementId!: string | null;

  @ApiProperty({
    description: 'Recipient email address.',
    format: 'email',
    example: 'client@example.com',
  })
  recipientEmail!: string;

  @ApiProperty({
    description: 'Notification type.',
    enum: NotificationType,
    example: NotificationType.AGREEMENT_INVITE,
  })
  type!: NotificationType;

  @ApiProperty({
    description: 'Rendered email subject.',
    example: 'دعوة لمراجعة اتفاق ضمان',
  })
  subject!: string;

  @ApiProperty({
    description: 'Notification status.',
    enum: NotificationStatus,
    example: NotificationStatus.SENT,
  })
  status!: NotificationStatus;

  @ApiProperty({
    description: 'Provider message ID when available, otherwise null.',
    example: 'msg_01HZX7N8K2',
    nullable: true,
  })
  providerMessageId!: string | null;

  @ApiProperty({
    description:
      'Sanitized error message when provider or rendering failed, otherwise null.',
    example: null,
    nullable: true,
  })
  errorMessage!: string | null;

  @ApiProperty({
    description:
      'Rendered HTML stored for preview/fallback diagnostics when available, otherwise null.',
    example:
      '<html dir="rtl"><body><h1>دعوة لمراجعة الاتفاق</h1></body></html>',
    nullable: true,
  })
  previewHtml!: string | null;

  @ApiProperty({
    description:
      'Send timestamp when provider delivery succeeded, otherwise null.',
    format: 'date-time',
    example: '2026-04-29T10:30:00.000Z',
    nullable: true,
  })
  sentAt!: string | null;

  @ApiProperty({
    description: 'Record creation timestamp.',
    format: 'date-time',
    example: '2026-04-29T10:30:00.000Z',
  })
  createdAt!: string;
}
