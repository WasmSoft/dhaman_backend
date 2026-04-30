import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const AI_STRICTNESS_VALUES = ['lenient', 'balanced', 'strict'] as const;

export class UpdateSettingsDto {
  @ApiProperty({
    description: 'Default currency used for future agreements.',
    example: 'USD',
    required: false,
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Z]+$/)
  defaultCurrency?: string;

  @ApiProperty({
    description: 'Default service type used to prefill future agreements.',
    example: 'Logo Design',
    required: false,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  defaultServiceType?: string;

  @ApiProperty({
    description: 'AI strictness preference used for future plan generation.',
    example: 'balanced',
    required: false,
    enum: AI_STRICTNESS_VALUES,
  })
  @IsOptional()
  @IsString()
  @IsIn(AI_STRICTNESS_VALUES)
  aiStrictness?: (typeof AI_STRICTNESS_VALUES)[number];

  @ApiProperty({
    description: 'Whether email notifications are enabled for the freelancer.',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;
}
