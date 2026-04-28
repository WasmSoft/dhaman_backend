import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateChangeRequestDto {
  @IsUUID()
  agreementId!: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  amount!: string;

  @IsString()
  @MaxLength(10)
  currency!: string;

  @IsObject()
  acceptanceCriteria!: Record<string, unknown>;
}

export class ChangeRequestActionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
