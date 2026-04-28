import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDeliveryDto {
  @IsOptional()
  @IsString()
  deliveryUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsString()
  summary!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeliveryActionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeliveryLookupDto {
  @IsOptional()
  @IsUUID()
  agreementId?: string;
}
