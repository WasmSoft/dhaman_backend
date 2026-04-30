import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class EmailPreviewResponseDto {
  @ApiProperty({
    description: 'Notification type.',
    enum: NotificationType,
    example: NotificationType.AGREEMENT_INVITE,
  })
  type!: NotificationType;

  @ApiProperty({
    description: 'Recipient email when known from context, otherwise null.',
    format: 'email',
    example: 'client@example.com',
    nullable: true,
  })
  recipientEmail!: string | null;

  @ApiProperty({
    description: 'Rendered email subject.',
    example: 'دعوة لمراجعة اتفاق ضمان',
  })
  subject!: string;

  @ApiProperty({
    description: 'Rendered HTML body for preview.',
    example:
      '<html dir="rtl"><body><h1>دعوة لمراجعة الاتفاق</h1></body></html>',
  })
  previewHtml!: string;

  @ApiPropertyOptional({
    description: 'Optional plain-text body for accessibility and debugging.',
    example: 'دعوة لمراجعة اتفاق ضمان...',
  })
  previewText?: string;

  @ApiProperty({
    description: 'Resolved locale used for rendering.',
    enum: ['ar', 'en'],
    example: 'ar',
  })
  locale!: 'ar' | 'en';
}
