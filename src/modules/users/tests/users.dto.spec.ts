import { UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  UpdateUserDto,
  UpdateUserProfileDto,
  UserProfileResponseDto,
  UserResponseDto,
} from '../dto/users.dto';

async function validateDto<T extends object>(
  cls: new () => T,
  plain: object,
): Promise<string[]> {
  const instance = plainToInstance(cls, plain);
  const errors = await validate(instance);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('UpdateUserDto', () => {
  it('passes validation with a valid name and a valid avatarUrl', async () => {
    const errors = await validateDto(UpdateUserDto, {
      name: 'أحمد محمد',
      avatarUrl: 'https://cdn.dhaman.io/avatars/ahmed.jpg',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails validation when avatarUrl is not a valid URL', async () => {
    const errors = await validateDto(UpdateUserDto, {
      avatarUrl: 'not-a-url',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails validation when name exceeds 100 characters', async () => {
    const errors = await validateDto(UpdateUserDto, {
      name: 'أ'.repeat(101),
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes validation with an empty body', async () => {
    const errors = await validateDto(UpdateUserDto, {});
    expect(errors).toHaveLength(0);
  });

  it('fails validation when avatarUrl is an empty string', async () => {
    const errors = await validateDto(UpdateUserDto, { avatarUrl: '' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes validation even when unknown fields are present', async () => {
    const errors = await validateDto(UpdateUserDto, {
      name: 'أحمد',
      unknownField: 'should be ignored',
    });
    expect(errors).toHaveLength(0);
  });
});

describe('UserResponseDto', () => {
  const sampleUser = {
    id: 'c9f1e2a3-4b5c-6d7e-8f9a-0b1c2d3e4f5a',
    name: 'أحمد محمد',
    email: 'ahmed@example.com',
    role: UserRole.FREELANCER,
    avatarUrl: 'https://cdn.dhaman.io/avatars/ahmed.jpg',
    createdAt: new Date('2026-01-15T10:00:00.000Z'),
    updatedAt: new Date('2026-04-20T14:30:00.000Z'),
  };

  it('contains all seven required fields when mapped from a user record', () => {
    const dto = plainToInstance(UserResponseDto, sampleUser);
    expect(dto.id).toBe(sampleUser.id);
    expect(dto.name).toBe(sampleUser.name);
    expect(dto.email).toBe(sampleUser.email);
    expect(dto.role).toBe(UserRole.FREELANCER);
    expect(dto.avatarUrl).toBe(sampleUser.avatarUrl);
    expect(dto.createdAt).toEqual(sampleUser.createdAt);
    expect(dto.updatedAt).toEqual(sampleUser.updatedAt);
  });

  it('does not contain a passwordHash property', () => {
    const dto = plainToInstance(UserResponseDto, {
      ...sampleUser,
      passwordHash: '$2b$10$secret',
    });
    expect(
      (dto as unknown as { passwordHash?: unknown }).passwordHash,
    ).toBeUndefined();
  });

  it('returns avatarUrl as null when the user has no avatar', () => {
    const dto = plainToInstance(UserResponseDto, {
      ...sampleUser,
      avatarUrl: null,
    });
    expect(dto.avatarUrl).toBeNull();
  });
});

describe('UpdateUserProfileDto', () => {
  it('passes validation with preferredCurrency SAR', async () => {
    const errors = await validateDto(UpdateUserProfileDto, {
      preferredCurrency: 'SAR',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails validation with preferredCurrency XYZ', async () => {
    const errors = await validateDto(UpdateUserProfileDto, {
      preferredCurrency: 'XYZ',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes validation with locale ar', async () => {
    const errors = await validateDto(UpdateUserProfileDto, {
      locale: 'ar',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails validation with locale fr', async () => {
    const errors = await validateDto(UpdateUserProfileDto, {
      locale: 'fr',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails validation when bio exceeds 1000 characters', async () => {
    const errors = await validateDto(UpdateUserProfileDto, {
      bio: 'ب'.repeat(1001),
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes validation when only specialization is provided', async () => {
    const errors = await validateDto(UpdateUserProfileDto, {
      specialization: 'تصميم الهوية البصرية',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails validation when preferredCurrency is lowercase sar', async () => {
    const errors = await validateDto(UpdateUserProfileDto, {
      preferredCurrency: 'sar',
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UserProfileResponseDto', () => {
  const sampleProfile = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    userId: 'c9f1e2a3-4b5c-6d7e-8f9a-0b1c2d3e4f5a',
    businessName: 'مؤسسة أحمد للتصميم',
    bio: 'مصمم جرافيك محترف',
    specialization: 'تصميم الهوية البصرية',
    preferredCurrency: 'SAR',
    locale: 'ar',
    createdAt: new Date('2026-01-15T10:00:00.000Z'),
    updatedAt: new Date('2026-04-20T14:30:00.000Z'),
  };

  it('contains all nine required fields when mapped from a profile record', () => {
    const dto = plainToInstance(UserProfileResponseDto, sampleProfile);
    expect(dto.id).toBe(sampleProfile.id);
    expect(dto.userId).toBe(sampleProfile.userId);
    expect(dto.businessName).toBe(sampleProfile.businessName);
    expect(dto.bio).toBe(sampleProfile.bio);
    expect(dto.specialization).toBe(sampleProfile.specialization);
    expect(dto.preferredCurrency).toBe('SAR');
    expect(dto.locale).toBe('ar');
    expect(dto.createdAt).toEqual(sampleProfile.createdAt);
    expect(dto.updatedAt).toEqual(sampleProfile.updatedAt);
  });
});
