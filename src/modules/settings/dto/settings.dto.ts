import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultCurrency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  defaultServiceType?: string;

  @IsOptional()
  @IsString()
  aiStrictness?: string;

  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;
}
