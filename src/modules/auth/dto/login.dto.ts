import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Demo login email address.',
    example: 'demo@demo.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description:
      'Account password. Credential correctness is checked by the auth service.',
    example: 'temporary123',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  password!: string;
}
