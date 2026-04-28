import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class FundMilestonePaymentDto {
  @IsUUID()
  agreementId!: string;

  @IsUUID()
  milestoneId!: string;

  @IsString()
  amount!: string;

  @IsString()
  @MaxLength(10)
  currency!: string;
}

export class ReleasePaymentDto {
  @IsUUID()
  paymentId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
