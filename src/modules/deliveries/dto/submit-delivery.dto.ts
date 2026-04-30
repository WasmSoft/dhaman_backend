import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitDeliveryDto {
  @ApiPropertyOptional({
    description:
      'Optional submitted timestamp override in ISO 8601 format. Normally server-generated / وقت الإرسال الاختياري',
    example: '2026-04-29T12:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @ApiPropertyOptional({
    description:
      'Optional note to the client included in timeline or email metadata / رسالة اختيارية للعميل',
    example: 'Please review the responsive behavior on tablet and desktop.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  noteToClient?: string;
}
