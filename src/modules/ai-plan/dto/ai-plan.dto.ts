import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GenerateAiPlanDto {
  @IsOptional()
  @IsUUID()
  agreementId?: string;

  @IsString()
  @MaxLength(2000)
  prompt!: string;
}
