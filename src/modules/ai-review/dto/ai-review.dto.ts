import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAiReviewDto {
  @IsUUID()
  agreementId!: string;

  @IsUUID()
  milestoneId!: string;

  @IsOptional()
  @IsUUID()
  deliveryId?: string;

  @IsString()
  @MaxLength(4000)
  objection!: string;
}
