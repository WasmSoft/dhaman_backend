import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  DefaultPoliciesResponseDto,
  SettingsResponseDto,
} from './dto/settings-response.dto';
import { UpdateDefaultPoliciesDto } from './dto/update-default-policies.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const ALLOWED_AI_STRICTNESS = ['lenient', 'balanced', 'strict'] as const;
const ALLOWED_CURRENCIES = ['USD', 'SAR', 'AED', 'EUR'] as const;

type SettingsRecord = Awaited<
  ReturnType<PrismaService['userSettings']['upsert']>
>;

type SettingsUpdateData = Prisma.UserSettingsUncheckedUpdateInput;

/**
 * Module responsibility:
 * - Manage freelancer default policies and preference values.
 * Main entities touched:
 * - UserSettings.
 * Expected endpoints:
 * - GET /settings
 * - PATCH /settings
 * - GET /settings/default-policies
 * - PATCH /settings/default-policies
 * Business rules:
 * - Keep one settings record per user.
 * - Validate supported currency and strictness values.
 * Implementation phases:
 * - Phase 3 service logic.
 * Error cases to document:
 * - SETTINGS_CREATE_FAILED, SETTINGS_UPDATE_FAILED, SETTINGS_INVALID_*.
 * Testing cases to cover:
 * - fetch existing settings, initialize defaults, invalid values.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clsService: ClsService,
  ) {}

  async getSettings(): Promise<SettingsResponseDto> {
    const userId = await this.getCurrentUserId();
    const settings = await this.getOrCreateSettings(userId);

    return this.toSettingsResponse(settings);
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    const userId = await this.getCurrentUserId();
    const data = this.buildSettingsUpdateData(dto);

    if (Object.keys(data).length === 0) {
      return this.getSettings();
    }

    await this.ensureUserExists(userId);

    try {
      const settings = await this.prisma.userSettings.upsert({
        where: { userId },
        create: { userId, ...data } as Prisma.UserSettingsUncheckedCreateInput,
        update: data,
      });

      return this.toSettingsResponse(settings);
    } catch {
      throw new AppException({ code: ErrorCode.SETTINGS_UPDATE_FAILED });
    }
  }

  async getDefaultPolicies(): Promise<DefaultPoliciesResponseDto> {
    const userId = await this.getCurrentUserId();
    const settings = await this.getOrCreateSettings(userId);

    return this.toDefaultPoliciesResponse(settings);
  }

  async updateDefaultPolicies(
    dto: UpdateDefaultPoliciesDto,
  ): Promise<DefaultPoliciesResponseDto> {
    const userId = await this.getCurrentUserId();
    const data = this.buildDefaultPoliciesUpdateData(dto);

    if (Object.keys(data).length === 0) {
      return this.getDefaultPolicies();
    }

    await this.ensureUserExists(userId);

    try {
      const settings = await this.prisma.userSettings.upsert({
        where: { userId },
        create: { userId, ...data } as Prisma.UserSettingsUncheckedCreateInput,
        update: data,
      });

      return this.toDefaultPoliciesResponse(settings);
    } catch {
      throw new AppException({ code: ErrorCode.SETTINGS_UPDATE_FAILED });
    }
  }

  async getAgreementDefaults(userId?: string) {
    const resolvedUserId = userId ?? (await this.getCurrentUserId());
    const settings = await this.getOrCreateSettings(resolvedUserId);

    return {
      defaultCurrency: settings.defaultCurrency,
      defaultServiceType: settings.defaultServiceType,
      defaultDelayPolicy: settings.defaultDelayPolicy,
      defaultCancellationPolicy: settings.defaultCancellationPolicy,
      defaultExtraRequestPolicy: settings.defaultExtraRequestPolicy,
      defaultReviewPolicy: settings.defaultReviewPolicy,
      aiStrictness: settings.aiStrictness,
      emailNotificationsEnabled: settings.emailNotificationsEnabled,
    };
  }

  private async getCurrentUserId(): Promise<string> {
    const userId = this.clsService.get('userId');

    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    return userId;
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new AppException({ code: ErrorCode.USER_NOT_FOUND });
    }
  }

  // Upsert keeps first-read creation and duplicate safety in one path.
  private async getOrCreateSettings(userId: string): Promise<SettingsRecord> {
    await this.ensureUserExists(userId);

    try {
      return await this.prisma.userSettings.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    } catch {
      throw new AppException({ code: ErrorCode.SETTINGS_CREATE_FAILED });
    }
  }

  private buildSettingsUpdateData(dto: UpdateSettingsDto): SettingsUpdateData {
    const data: SettingsUpdateData = {};

    if (dto.defaultCurrency !== undefined) {
      const normalizedCurrency = dto.defaultCurrency.toUpperCase();

      if (!ALLOWED_CURRENCIES.includes(normalizedCurrency as never)) {
        throw new AppException({ code: ErrorCode.SETTINGS_INVALID_CURRENCY });
      }

      data.defaultCurrency = normalizedCurrency;
    }

    if (dto.defaultServiceType !== undefined) {
      data.defaultServiceType = dto.defaultServiceType;
    }

    if (dto.aiStrictness !== undefined) {
      if (!ALLOWED_AI_STRICTNESS.includes(dto.aiStrictness as never)) {
        throw new AppException({
          code: ErrorCode.SETTINGS_INVALID_AI_STRICTNESS,
        });
      }

      data.aiStrictness = dto.aiStrictness;
    }

    if (dto.emailNotificationsEnabled !== undefined) {
      data.emailNotificationsEnabled = dto.emailNotificationsEnabled;
    }

    return data;
  }

  private buildDefaultPoliciesUpdateData(
    dto: UpdateDefaultPoliciesDto,
  ): SettingsUpdateData {
    const data: SettingsUpdateData = {};

    if (dto.defaultDelayPolicy !== undefined) {
      data.defaultDelayPolicy = dto.defaultDelayPolicy;
    }

    if (dto.defaultCancellationPolicy !== undefined) {
      data.defaultCancellationPolicy = dto.defaultCancellationPolicy;
    }

    if (dto.defaultExtraRequestPolicy !== undefined) {
      data.defaultExtraRequestPolicy = dto.defaultExtraRequestPolicy;
    }

    if (dto.defaultReviewPolicy !== undefined) {
      data.defaultReviewPolicy = dto.defaultReviewPolicy;
    }

    return data;
  }

  private toSettingsResponse(settings: SettingsRecord): SettingsResponseDto {
    return {
      id: settings.id,
      userId: settings.userId,
      defaultCurrency: settings.defaultCurrency,
      defaultServiceType: settings.defaultServiceType,
      defaultDelayPolicy: settings.defaultDelayPolicy,
      defaultCancellationPolicy: settings.defaultCancellationPolicy,
      defaultExtraRequestPolicy: settings.defaultExtraRequestPolicy,
      defaultReviewPolicy: settings.defaultReviewPolicy,
      aiStrictness: settings.aiStrictness,
      emailNotificationsEnabled: settings.emailNotificationsEnabled,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  private toDefaultPoliciesResponse(
    settings: SettingsRecord,
  ): DefaultPoliciesResponseDto {
    return {
      defaultDelayPolicy: settings.defaultDelayPolicy,
      defaultCancellationPolicy: settings.defaultCancellationPolicy,
      defaultExtraRequestPolicy: settings.defaultExtraRequestPolicy,
      defaultReviewPolicy: settings.defaultReviewPolicy,
    };
  }
}
