import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Freelancer display name.',
    example: 'Demo Admin',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Freelancer login email address.',
    example: 'demo@demo.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Account password for email/password login.',
    example: 'temporary123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
