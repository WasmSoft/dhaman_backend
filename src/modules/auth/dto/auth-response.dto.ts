import { ApiProperty } from '@nestjs/swagger';
import { UserProfileDto } from './user-profile.dto';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token issued after successful authentication.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Safe authenticated user profile.',
    type: () => UserProfileDto,
  })
  user!: UserProfileDto;
}
