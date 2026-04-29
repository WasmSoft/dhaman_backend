import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export const ALLOWED_CURRENCIES = [
  'SAR',
  'USD',
  'EUR',
  'AED',
  'KWD',
  'BHD',
  'QAR',
  'OMR',
  'EGP',
] as const;

export const ALLOWED_LOCALES = ['ar', 'en'] as const;

@Exclude()
export class UpdateUserDto {
  @ApiProperty({
    description: 'Display name shown across the platform',
    example: 'أحمد محمد',
    required: false,
    maxLength: 100,
  })
  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Public avatar image URL',
    example: 'https://cdn.dhaman.io/avatars/ahmed.jpg',
    required: false,
  })
  @Expose()
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  avatarUrl?: string;
}

@Exclude()
export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier (UUID)',
    example: 'c9f1e2a3-4b5c-6d7e-8f9a-0b1c2d3e4f5a',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Display name',
    example: 'أحمد محمد',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Login email address (read-only)',
    example: 'ahmed@example.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    enum: UserRole,
    description: 'Account role',
    example: UserRole.FREELANCER,
  })
  @Expose()
  role: UserRole;

  @ApiProperty({
    description: 'Avatar image URL - null when not set',
    example: 'https://cdn.dhaman.io/avatars/ahmed.jpg',
    nullable: true,
  })
  @Expose()
  avatarUrl: string | null;

  @ApiProperty({
    description: 'Account creation timestamp (ISO-8601)',
    example: '2026-01-15T10:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp (ISO-8601)',
    example: '2026-04-20T14:30:00.000Z',
  })
  @Expose()
  updatedAt: Date;
}

@Exclude()
export class UpdateUserProfileDto {
  @ApiProperty({
    description: 'Freelancer business or brand name',
    example: 'مؤسسة أحمد للتصميم',
    required: false,
    maxLength: 200,
  })
  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessName?: string;

  @ApiProperty({
    description: 'Short professional biography',
    example: 'مصمم جرافيك محترف بخبرة أكثر من 10 سنوات',
    required: false,
    maxLength: 1000,
  })
  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiProperty({
    description: 'Primary area of professional specialization',
    example: 'تصميم الهوية البصرية',
    required: false,
    maxLength: 100,
  })
  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialization?: string;

  @ApiProperty({
    description: 'Preferred currency for agreements and invoices',
    example: 'SAR',
    required: false,
    enum: ALLOWED_CURRENCIES,
  })
  @Expose()
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_CURRENCIES)
  preferredCurrency?: string;

  @ApiProperty({
    description: 'UI locale preference',
    example: 'ar',
    required: false,
    enum: ALLOWED_LOCALES,
  })
  @Expose()
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_LOCALES)
  locale?: string;
}

@Exclude()
export class UserProfileResponseDto {
  @ApiProperty({
    description: 'Profile record unique identifier (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'ID of the user this profile belongs to (UUID)',
    example: 'c9f1e2a3-4b5c-6d7e-8f9a-0b1c2d3e4f5a',
  })
  @Expose()
  userId: string;

  @ApiProperty({
    description: 'Freelancer business or brand name',
    example: 'مؤسسة أحمد للتصميم',
    nullable: true,
  })
  @Expose()
  businessName: string | null;

  @ApiProperty({
    description: 'Short professional biography',
    example: 'مصمم جرافيك محترف بخبرة أكثر من 10 سنوات',
    nullable: true,
  })
  @Expose()
  bio: string | null;

  @ApiProperty({
    description: 'Primary area of professional specialization',
    example: 'تصميم الهوية البصرية',
    nullable: true,
  })
  @Expose()
  specialization: string | null;

  @ApiProperty({
    description: 'Preferred currency for agreements and invoices',
    example: 'SAR',
    enum: ALLOWED_CURRENCIES,
  })
  @Expose()
  preferredCurrency: string;

  @ApiProperty({
    description: 'UI locale preference',
    example: 'ar',
    enum: ALLOWED_LOCALES,
  })
  @Expose()
  locale: string;

  @ApiProperty({
    description: 'Profile creation timestamp (ISO-8601)',
    example: '2026-01-15T10:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp (ISO-8601)',
    example: '2026-04-20T14:30:00.000Z',
  })
  @Expose()
  updatedAt: Date;
}

export type UpdateCurrentUserDto = UpdateUserDto;
