import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Freelancer display name.',
    example: 'Sara Ahmed',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Freelancer login email address.',
    example: 'sara@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Account password for email/password login.',
    example: 'Str0ngPassw0rd!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
