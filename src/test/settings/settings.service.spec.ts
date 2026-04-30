import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SettingsService } from '../../modules/settings/settings.service';

type MockPrisma = {
  user: {
    findUnique: jest.Mock;
  };
  userSettings: {
    upsert: jest.Mock;
  };
};

function makeSettingsRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'settings-1',
    userId: 'user-1',
    defaultCurrency: 'USD',
    defaultServiceType: 'Logo Design',
    defaultDelayPolicy: null,
    defaultCancellationPolicy: null,
    defaultExtraRequestPolicy: null,
    defaultReviewPolicy: null,
    aiStrictness: 'balanced',
    emailNotificationsEnabled: true,
    businessName: null,
    bio: null,
    specialization: null,
    preferredCurrency: 'SAR',
    locale: 'ar',
    createdAt: new Date('2026-04-30T10:00:00.000Z'),
    updatedAt: new Date('2026-04-30T10:15:00.000Z'),
    ...overrides,
  };
}

describe('SettingsService', () => {
  let service: SettingsService;
  let clsService: jest.Mocked<Pick<ClsService, 'get'>>;
  let prismaService: MockPrisma;

  beforeEach(() => {
    clsService = {
      get: jest.fn(),
    };

    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
      userSettings: {
        upsert: jest.fn(),
      },
    };

    service = new SettingsService(
      prismaService as unknown as PrismaService,
      clsService as ClsService,
    );
  });

  it('throws UNAUTHORIZED when CLS has no userId', async () => {
    clsService.get.mockReturnValue(undefined);

    await expect(service.getSettings()).rejects.toMatchObject({
      code: ErrorCode.UNAUTHORIZED,
    });
  });

  it('creates or returns settings on first read', async () => {
    clsService.get.mockReturnValue('user-1');
    prismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prismaService.userSettings.upsert.mockResolvedValue(makeSettingsRecord());

    const result = await service.getSettings();

    expect(prismaService.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1' },
      update: {},
    });
    expect(result.defaultCurrency).toBe('USD');
    expect(result.createdAt).toBe('2026-04-30T10:00:00.000Z');
  });

  it('throws USER_NOT_FOUND when the authenticated user is missing', async () => {
    clsService.get.mockReturnValue('missing-user');
    prismaService.user.findUnique.mockResolvedValue(null);

    await expect(service.getSettings()).rejects.toMatchObject({
      code: ErrorCode.USER_NOT_FOUND,
    });
  });

  it('normalizes currency and updates only provided general settings fields', async () => {
    clsService.get.mockReturnValue('user-1');
    prismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prismaService.userSettings.upsert.mockResolvedValue(
      makeSettingsRecord({ defaultCurrency: 'EUR' }),
    );

    await service.updateSettings({
      defaultCurrency: 'eur',
      emailNotificationsEnabled: false,
    });

    expect(prismaService.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: {
        userId: 'user-1',
        defaultCurrency: 'EUR',
        emailNotificationsEnabled: false,
      },
      update: {
        defaultCurrency: 'EUR',
        emailNotificationsEnabled: false,
      },
    });
  });

  it('throws SETTINGS_INVALID_AI_STRICTNESS for unsupported strictness', async () => {
    clsService.get.mockReturnValue('user-1');

    await expect(
      service.updateSettings({ aiStrictness: 'aggressive' as never }),
    ).rejects.toMatchObject({
      code: ErrorCode.SETTINGS_INVALID_AI_STRICTNESS,
    });
    expect(prismaService.user.findUnique).not.toHaveBeenCalled();
  });

  it('throws SETTINGS_INVALID_CURRENCY for unsupported currency', async () => {
    clsService.get.mockReturnValue('user-1');

    await expect(
      service.updateSettings({ defaultCurrency: 'XYZ' }),
    ).rejects.toMatchObject({
      code: ErrorCode.SETTINGS_INVALID_CURRENCY,
    });
    expect(prismaService.user.findUnique).not.toHaveBeenCalled();
  });

  it('updates default policy fields without touching other models', async () => {
    clsService.get.mockReturnValue('user-1');
    prismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prismaService.userSettings.upsert.mockResolvedValue(
      makeSettingsRecord({ defaultReviewPolicy: 'Review policy' }),
    );

    const result = await service.updateDefaultPolicies({
      defaultReviewPolicy: 'Review policy',
    });

    expect(prismaService.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', defaultReviewPolicy: 'Review policy' },
      update: { defaultReviewPolicy: 'Review policy' },
    });
    expect(result).toEqual({
      defaultDelayPolicy: null,
      defaultCancellationPolicy: null,
      defaultExtraRequestPolicy: null,
      defaultReviewPolicy: 'Review policy',
    });
  });

  it('returns a stable internal defaults subset', async () => {
    clsService.get.mockReturnValue('user-1');
    prismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prismaService.userSettings.upsert.mockResolvedValue(
      makeSettingsRecord({ defaultExtraRequestPolicy: 'Extra policy' }),
    );

    const result = await service.getAgreementDefaults();

    expect(result).toEqual({
      defaultCurrency: 'USD',
      defaultServiceType: 'Logo Design',
      defaultDelayPolicy: null,
      defaultCancellationPolicy: null,
      defaultExtraRequestPolicy: 'Extra policy',
      defaultReviewPolicy: null,
      aiStrictness: 'balanced',
      emailNotificationsEnabled: true,
    });
  });
});
