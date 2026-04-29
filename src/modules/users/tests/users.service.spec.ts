import { AppException } from '../../../common/errors/app-exception';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { ClsService } from '../../../common/cls/cls.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { UsersService } from '../users.service';

type MockPrisma = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  userSettings: {
    upsert: jest.Mock;
  };
};

describe('UsersService', () => {
  let service: UsersService;
  let clsService: jest.Mocked<Pick<ClsService, 'get'>>;
  let prismaService: MockPrisma;

  beforeEach(() => {
    clsService = {
      get: jest.fn(),
    };

    prismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      userSettings: {
        upsert: jest.fn(),
      },
    };

    service = new UsersService(
      clsService as ClsService,
      prismaService as unknown as PrismaService,
    );
  });

  describe('getMe', () => {
    it('returns user data without passwordHash', async () => {
      clsService.get.mockReturnValue('user-1');
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'أحمد محمد',
        email: 'ahmed@example.com',
        role: 'FREELANCER',
        avatarUrl: null,
        createdAt: new Date('2026-01-15T10:00:00.000Z'),
        updatedAt: new Date('2026-04-20T14:30:00.000Z'),
      });

      const result = await service.getMe();

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        omit: { passwordHash: true },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 'user-1',
          email: 'ahmed@example.com',
        }),
      );
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws UNAUTHORIZED when no userId is present in CLS', async () => {
      clsService.get.mockReturnValue(undefined);

      await expect(service.getMe()).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
      });
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('throws AUTH_USER_NOT_FOUND when the user does not exist', async () => {
      clsService.get.mockReturnValue('missing-user');
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe()).rejects.toMatchObject({
        code: ErrorCode.AUTH_USER_NOT_FOUND,
      });
    });
  });

  describe('updateMe', () => {
    it('updates only provided fields', async () => {
      clsService.get.mockReturnValue('user-1');
      prismaService.user.update.mockResolvedValue({
        id: 'user-1',
        name: 'اسم جديد',
        email: 'ahmed@example.com',
        role: 'FREELANCER',
        avatarUrl: null,
        createdAt: new Date('2026-01-15T10:00:00.000Z'),
        updatedAt: new Date('2026-04-20T14:30:00.000Z'),
      });

      await service.updateMe({ name: 'اسم جديد', avatarUrl: undefined });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'اسم جديد' },
        omit: { passwordHash: true },
      });
    });

    it('returns the unchanged record for an empty body', async () => {
      clsService.get.mockReturnValue('user-1');
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'أحمد محمد',
        email: 'ahmed@example.com',
        role: 'FREELANCER',
        avatarUrl: null,
        createdAt: new Date('2026-01-15T10:00:00.000Z'),
        updatedAt: new Date('2026-04-20T14:30:00.000Z'),
      });

      const result = await service.updateMe({});

      expect(prismaService.user.update).not.toHaveBeenCalled();
      expect(prismaService.user.findUnique).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        expect.objectContaining({
          id: 'user-1',
          name: 'أحمد محمد',
        }),
      );
    });

    it('maps Prisma not-found errors to AUTH_USER_NOT_FOUND', async () => {
      clsService.get.mockReturnValue('missing-user');
      prismaService.user.update.mockRejectedValue({ code: 'P2025' });

      await expect(
        service.updateMe({ name: 'اسم جديد' }),
      ).rejects.toMatchObject({
        code: ErrorCode.AUTH_USER_NOT_FOUND,
      });
    });
  });

  describe('getProfile', () => {
    it('returns the existing profile or creates default settings on first access', async () => {
      clsService.get.mockReturnValue('user-1');
      prismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prismaService.userSettings.upsert.mockResolvedValue({
        id: 'settings-1',
        userId: 'user-1',
        businessName: null,
        bio: null,
        specialization: null,
        preferredCurrency: 'SAR',
        locale: 'ar',
        createdAt: new Date('2026-01-15T10:00:00.000Z'),
        updatedAt: new Date('2026-04-20T14:30:00.000Z'),
      });

      const result = await service.getProfile();

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { id: true },
      });
      expect(prismaService.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', preferredCurrency: 'SAR', locale: 'ar' },
        update: {},
      });
      expect(result.preferredCurrency).toBe('SAR');
      expect(result.locale).toBe('ar');
    });

    it('throws AUTH_USER_NOT_FOUND when the base user is missing', async () => {
      clsService.get.mockReturnValue('missing-user');
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile()).rejects.toMatchObject({
        code: ErrorCode.AUTH_USER_NOT_FOUND,
      });
      expect(prismaService.userSettings.upsert).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('upserts profile data with defaults preserved for first write', async () => {
      clsService.get.mockReturnValue('user-1');
      prismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prismaService.userSettings.upsert.mockResolvedValue({
        id: 'settings-1',
        userId: 'user-1',
        businessName: 'مؤسسة أحمد',
        bio: null,
        specialization: null,
        preferredCurrency: 'SAR',
        locale: 'ar',
        createdAt: new Date('2026-01-15T10:00:00.000Z'),
        updatedAt: new Date('2026-04-20T14:30:00.000Z'),
      });

      await service.updateProfile({
        businessName: 'مؤسسة أحمد',
        locale: undefined,
      });

      expect(prismaService.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: {
          userId: 'user-1',
          preferredCurrency: 'SAR',
          locale: 'ar',
          businessName: 'مؤسسة أحمد',
        },
        update: {
          businessName: 'مؤسسة أحمد',
        },
      });
    });

    it('throws AUTH_USER_NOT_FOUND when the base user is missing', async () => {
      clsService.get.mockReturnValue('missing-user');
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile({ bio: 'نبذة' }),
      ).rejects.toMatchObject({
        code: ErrorCode.AUTH_USER_NOT_FOUND,
      });
    });
  });

  it('throws AppException instances for domain failures', async () => {
    clsService.get.mockReturnValue(undefined);

    await expect(service.updateProfile({})).rejects.toBeInstanceOf(
      AppException,
    );
  });
});
