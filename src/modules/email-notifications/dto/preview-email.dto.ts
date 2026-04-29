import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';

export class PreviewEmailDto {
  @ApiProperty({
    description:
      'Notification type. Determines which template is previewed.',
    enum: NotificationType,
    example: NotificationType.AGREEMENT_INVITE,
    required: true,
  })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({
    description: 'Agreement ID for agreement-scoped templates.',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: true,
  })
  @IsUUID()
  agreementId!: string;

  @ApiPropertyOptional({
    description:
      'Template locale. Defaults to request context locale, then Arabic.',
    enum: ['ar', 'en'],
    example: 'ar',
  })
  @IsOptional()
  @IsIn(['ar', 'en'])
  locale?: 'ar' | 'en';

  @ApiPropertyOptional({
    description:
      'Template-specific metadata for delivery, payment, AI review, or change request context. Only documented keys are accepted.',
    example: {
      deliveryId: '550e8400-e29b-41d4-a716-446655440001',
    },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
