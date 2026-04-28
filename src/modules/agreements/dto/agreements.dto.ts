import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAgreementDto {
  @IsUUID()
  clientId!: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  @MaxLength(120)
  serviceType!: string;

  @IsString()
  totalAmount!: string;

  @IsString()
  @MaxLength(10)
  currency!: string;

  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;
}

export class UpdateAgreementDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  totalAmount?: string;
}

export class AgreementActionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
