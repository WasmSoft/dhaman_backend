import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AcceptDeliveryDto {
  @ApiPropertyOptional({
    description:
      'Optional client acceptance note / ملاحظة اختيارية من العميل عند القبول',
    example: 'Approved. Please keep the editable source files available for archive.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
