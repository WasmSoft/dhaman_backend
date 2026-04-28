import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAgreementPoliciesDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  delayPolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationPolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  extraRequestPolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewPolicy?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  clientReviewPeriodDays?: number;
}
