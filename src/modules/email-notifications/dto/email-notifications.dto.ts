import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class EmailPreviewDto {
  @IsString()
  @MaxLength(120)
  template!: string;

  @IsOptional()
  @IsString()
  referenceId?: string;
}

export class SendTestEmailDto {
  @IsEmail()
  recipientEmail!: string;

  @IsString()
  @MaxLength(120)
  template!: string;
}
