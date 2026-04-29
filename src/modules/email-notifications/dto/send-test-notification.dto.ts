import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { IsEmail, IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';

export class SendTestNotificationDto {
  @ApiProperty({
    description:
      'Notification type. SYSTEM_TEST is supported by default for manual testing.',
    enum: NotificationType,
    example: NotificationType.SYSTEM_TEST,
    required: true,
  })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({
    description: 'Recipient email address for the test notification.',
    format: 'email',
    example: 'client@example.com',
    required: true,
  })
  @IsEmail()
  recipientEmail!: string;

  @ApiPropertyOptional({
    description:
      'Agreement ID, required when the selected notification type needs agreement context.',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  agreementId?: string;

  @ApiPropertyOptional({
    description:
      'Template locale. Defaults to request context locale, then Arabic.',
    enum: ['ar', 'en'],
    example: 'en',
  })
  @IsOptional()
  @IsIn(['ar', 'en'])
  locale?: 'ar' | 'en';
}
