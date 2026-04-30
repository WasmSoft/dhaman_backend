import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PortalRequestChangesDto {
  @ApiProperty({
    description: 'Reason for requesting changes to the agreement or delivery',
    example: 'The milestone timeline is too short for the scope described.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Specific change items requested',
    example: [
      'Extend milestone 1 deadline by 2 weeks',
      'Reduce total amount by 10%',
    ],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  requestedChanges?: string[];
}

export class PortalRejectAgreementDto {
  @ApiProperty({
    description: 'Reason for rejecting the agreement invitation',
    example: 'The budget does not match our current requirements.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;
}
