import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PortalDeclineChangeRequestDto {
  @ApiProperty({
    description: 'Client reason for declining the change request',
    example: 'The extra pages are not needed for this phase.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;
}
