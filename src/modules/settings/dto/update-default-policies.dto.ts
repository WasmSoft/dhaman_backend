import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDefaultPoliciesDto {
  @ApiProperty({
    description: 'Default delay policy copied into future agreements.',
    example: 'Late delivery beyond 3 days requires notice and revised timeline approval.',
    required: false,
    maxLength: 3000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  defaultDelayPolicy?: string;

  @ApiProperty({
    description: 'Default cancellation policy copied into future agreements.',
    example: 'Cancellation after project start keeps payment for completed work only.',
    required: false,
    maxLength: 3000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  defaultCancellationPolicy?: string;

  @ApiProperty({
    description: 'Default extra request policy copied into future agreements.',
    example: 'Requests outside the approved scope require a separate agreement update.',
    required: false,
    maxLength: 3000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  defaultExtraRequestPolicy?: string;

  @ApiProperty({
    description: 'Default review policy copied into future agreements.',
    example: 'The client has 3 business days to review each submitted deliverable.',
    required: false,
    maxLength: 3000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  defaultReviewPolicy?: string;
}
