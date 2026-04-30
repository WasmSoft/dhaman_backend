import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum';

export class UserProfileDto {
  @ApiProperty({
    description: 'User identifier.',
    example: '8fd86d34-cc8e-4f4e-bb4f-9c16cf693f80',
  })
  id!: string;

  @ApiProperty({
    description: 'Freelancer display name.',
    example: 'Demo Admin',
  })
  name!: string;

  @ApiProperty({
    description: 'Freelancer email address.',
    example: 'demo@demo.com',
  })
  email!: string;

  @ApiProperty({
    description: 'User role assigned by the backend.',
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.FREELANCER,
  })
  role!: UserRole;

  @ApiProperty({
    description: 'Optional profile image URL.',
    example: null,
    nullable: true,
    type: String,
  })
  avatarUrl!: string | null;
}
