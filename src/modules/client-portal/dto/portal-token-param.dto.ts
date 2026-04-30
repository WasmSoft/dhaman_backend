import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PortalTokenParamDto {
  @ApiProperty({
    description:
      'Portal access credential scoped to one agreement. No bearer token required.',
    example: 'xK9mP2vQ8nR5sT1wL4...',
    minLength: 10,
    maxLength: 200,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  token!: string;
}
