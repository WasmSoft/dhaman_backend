import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Freelancer login email address.',
    example: 'sara@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Account password. Credential correctness is checked by the auth service.',
    example: 'Str0ngPassw0rd!',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  password!: string;
}
