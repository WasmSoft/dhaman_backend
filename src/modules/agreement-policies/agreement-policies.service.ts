import { Injectable } from '@nestjs/common';
import { AgreementStatus, Prisma } from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  AgreementPolicyResponseDto,
  DefaultPoliciesResponseDto,
  UpdateAgreementPolicyDto,
  UpdateDefaultPoliciesDto,
} from './dto/agreement-policies.dto';

/**
 * Module responsibility:
 * - Store and validate agreement-level policy text and review windows.
 * Main entities touched:
 * - AgreementPolicy, Agreement.
 * Expected endpoints:
 * - GET /agreements/:agreementId/policies
 * - PATCH /agreements/:agreementId/policies
 * Business rules:
 * - Ensure one policy record per agreement.
 * - Validate grace and review period boundaries.
 * Implementation phases:
 * - Phase 2.
 * Error cases to document:
 * - POLICY_NOT_FOUND, POLICY_INVALID_REVIEW_PERIOD, POLICY_INVALID_CONTENT.
 * Testing cases to cover:
 * - fetch, update, invalid review period, agreement ownership.
 */
@Injectable()
export class AgreementPoliciesService {
  private readonly DEFAULT_POLICIES: DefaultPoliciesResponseDto = {
    delayPolicy: null,
    cancellationPolicy: null,
    extraRequestPolicy: null,
    reviewPolicy: null,
    clientReviewPeriodDays: 7,
    freelancerDelayGraceDays: 3,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly clsService: ClsService,
  ) {}

  async getPolicy(agreementId: string): Promise<AgreementPolicyResponseDto> {
    const freelancerId = this.getCurrentFreelancerId();

    const agreement = await this.prisma.agreement.findFirst({
      where: { id: agreementId, freelancerId },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    const policy = await this.prisma.agreementPolicy.findUnique({
      where: { agreementId },
    });

    if (!policy) {
      throw new AppException({ code: ErrorCode.POLICY_NOT_FOUND });
    }

    return this.toPolicyResponse(policy);
  }

  async upsertPolicy(
    agreementId: string,
    dto: UpdateAgreementPolicyDto,
  ): Promise<AgreementPolicyResponseDto> {
    const freelancerId = this.getCurrentFreelancerId();

    const agreement = await this.prisma.agreement.findFirst({
      where: { id: agreementId, freelancerId },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    if (agreement.status !== AgreementStatus.DRAFT) {
      throw new AppException({ code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED });
    }

    const textFieldKeys = [
      'delayPolicy',
      'cancellationPolicy',
      'extraRequestPolicy',
      'reviewPolicy',
    ] as const;

    for (const key of textFieldKeys) {
      if (dto[key] === '') {
        throw new AppException({ code: ErrorCode.POLICY_INVALID_CONTENT });
      }
    }

    const createData = {
      agreementId,
      delayPolicy: dto.delayPolicy ?? null,
      cancellationPolicy: dto.cancellationPolicy ?? null,
      extraRequestPolicy: dto.extraRequestPolicy ?? null,
      reviewPolicy: dto.reviewPolicy ?? null,
      clientReviewPeriodDays: dto.clientReviewPeriodDays ?? 7,
      freelancerDelayGraceDays: dto.freelancerDelayGraceDays ?? 3,
    };

    const updateData: Record<string, string | number | null> = {};

    if (dto.delayPolicy !== undefined) {
      updateData.delayPolicy = dto.delayPolicy;
    }

    if (dto.cancellationPolicy !== undefined) {
      updateData.cancellationPolicy = dto.cancellationPolicy;
    }

    if (dto.extraRequestPolicy !== undefined) {
      updateData.extraRequestPolicy = dto.extraRequestPolicy;
    }

    if (dto.reviewPolicy !== undefined) {
      updateData.reviewPolicy = dto.reviewPolicy;
    }

    if (dto.clientReviewPeriodDays !== undefined) {
      updateData.clientReviewPeriodDays = dto.clientReviewPeriodDays;
    }

    if (dto.freelancerDelayGraceDays !== undefined) {
      updateData.freelancerDelayGraceDays = dto.freelancerDelayGraceDays;
    }

    const policy = await this.prisma.agreementPolicy.upsert({
      where: { agreementId },
      create: createData,
      update: updateData,
    });

    return this.toPolicyResponse(policy);
  }

  async copyDefaultsToAgreement(
    agreementId: string,
  ): Promise<AgreementPolicyResponseDto> {
    const freelancerId = this.getCurrentFreelancerId();

    const agreement = await this.prisma.agreement.findFirst({
      where: { id: agreementId, freelancerId },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    if (agreement.status !== AgreementStatus.DRAFT) {
      throw new AppException({ code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED });
    }

    const existingPolicy = await this.prisma.agreementPolicy.findUnique({
      where: { agreementId },
    });

    if (existingPolicy) {
      return this.toPolicyResponse(existingPolicy);
    }

    const settings = await this.prisma.userSettings.findUnique({
      where: { userId: freelancerId },
      select: { defaultPolicies: true },
    });

    const defaults = this.normalizeDefaultPolicies(settings?.defaultPolicies);

    const policy = await this.prisma.agreementPolicy.create({
      data: {
        agreementId,
        delayPolicy: defaults.delayPolicy,
        cancellationPolicy: defaults.cancellationPolicy,
        extraRequestPolicy: defaults.extraRequestPolicy,
        reviewPolicy: defaults.reviewPolicy,
        clientReviewPeriodDays: defaults.clientReviewPeriodDays,
        freelancerDelayGraceDays: defaults.freelancerDelayGraceDays,
      },
    });

    return this.toPolicyResponse(policy);
  }

  async getDefaultPolicies(): Promise<DefaultPoliciesResponseDto> {
    const freelancerId = this.getCurrentFreelancerId();
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId: freelancerId },
      select: { defaultPolicies: true },
    });

    return this.normalizeDefaultPolicies(settings?.defaultPolicies);
  }

  async updateDefaultPolicies(
    dto: UpdateDefaultPoliciesDto,
  ): Promise<DefaultPoliciesResponseDto> {
    const freelancerId = this.getCurrentFreelancerId();
    this.validateDefaultPoliciesUpdate(dto);

    const settings = await this.prisma.userSettings.findUnique({
      where: { userId: freelancerId },
      select: { defaultPolicies: true },
    });
    const current = this.normalizeDefaultPolicies(settings?.defaultPolicies);

    const hasProvidedSupportedField =
      dto.delayPolicy !== undefined ||
      dto.cancellationPolicy !== undefined ||
      dto.extraRequestPolicy !== undefined ||
      dto.reviewPolicy !== undefined ||
      dto.clientReviewPeriodDays !== undefined ||
      dto.freelancerDelayGraceDays !== undefined;

    if (!hasProvidedSupportedField) {
      return current;
    }

    const merged: DefaultPoliciesResponseDto = {
      ...current,
      ...(dto.delayPolicy !== undefined
        ? { delayPolicy: dto.delayPolicy }
        : {}),
      ...(dto.cancellationPolicy !== undefined
        ? { cancellationPolicy: dto.cancellationPolicy }
        : {}),
      ...(dto.extraRequestPolicy !== undefined
        ? { extraRequestPolicy: dto.extraRequestPolicy }
        : {}),
      ...(dto.reviewPolicy !== undefined
        ? { reviewPolicy: dto.reviewPolicy }
        : {}),
      ...(dto.clientReviewPeriodDays !== undefined
        ? { clientReviewPeriodDays: dto.clientReviewPeriodDays }
        : {}),
      ...(dto.freelancerDelayGraceDays !== undefined
        ? { freelancerDelayGraceDays: dto.freelancerDelayGraceDays }
        : {}),
    };

    await this.prisma.userSettings.upsert({
      where: { userId: freelancerId },
      create: {
        userId: freelancerId,
        defaultPolicies: merged as unknown as Prisma.InputJsonValue,
      },
      update: {
        defaultPolicies: merged as unknown as Prisma.InputJsonValue,
      },
    });

    return merged;
  }

  private getCurrentFreelancerId(): string {
    const freelancerId = this.clsService.get('userId');

    if (!freelancerId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    return freelancerId;
  }

  private toPolicyResponse(policy: {
    id: string;
    agreementId: string;
    delayPolicy: string | null;
    cancellationPolicy: string | null;
    extraRequestPolicy: string | null;
    reviewPolicy: string | null;
    clientReviewPeriodDays: number;
    freelancerDelayGraceDays: number;
    createdAt: Date;
    updatedAt: Date;
  }): AgreementPolicyResponseDto {
    return {
      id: policy.id,
      agreementId: policy.agreementId,
      delayPolicy: policy.delayPolicy,
      cancellationPolicy: policy.cancellationPolicy,
      extraRequestPolicy: policy.extraRequestPolicy,
      reviewPolicy: policy.reviewPolicy,
      clientReviewPeriodDays: policy.clientReviewPeriodDays,
      freelancerDelayGraceDays: policy.freelancerDelayGraceDays,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }

  private normalizeDefaultPolicies(raw: unknown): DefaultPoliciesResponseDto {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ...this.DEFAULT_POLICIES };
    }

    const saved = raw as Record<string, unknown>;

    return {
      delayPolicy:
        typeof saved.delayPolicy === 'string' ? saved.delayPolicy : null,
      cancellationPolicy:
        typeof saved.cancellationPolicy === 'string'
          ? saved.cancellationPolicy
          : null,
      extraRequestPolicy:
        typeof saved.extraRequestPolicy === 'string'
          ? saved.extraRequestPolicy
          : null,
      reviewPolicy:
        typeof saved.reviewPolicy === 'string' ? saved.reviewPolicy : null,
      clientReviewPeriodDays:
        typeof saved.clientReviewPeriodDays === 'number' &&
        Number.isInteger(saved.clientReviewPeriodDays) &&
        saved.clientReviewPeriodDays >= 1 &&
        saved.clientReviewPeriodDays <= 90
          ? saved.clientReviewPeriodDays
          : this.DEFAULT_POLICIES.clientReviewPeriodDays,
      freelancerDelayGraceDays:
        typeof saved.freelancerDelayGraceDays === 'number' &&
        Number.isInteger(saved.freelancerDelayGraceDays) &&
        saved.freelancerDelayGraceDays >= 0 &&
        saved.freelancerDelayGraceDays <= 30
          ? saved.freelancerDelayGraceDays
          : this.DEFAULT_POLICIES.freelancerDelayGraceDays,
    };
  }

  private validateDefaultPoliciesUpdate(dto: UpdateDefaultPoliciesDto): void {
    const textKeys = [
      'delayPolicy',
      'cancellationPolicy',
      'extraRequestPolicy',
      'reviewPolicy',
    ] as const;

    for (const key of textKeys) {
      const value = dto[key];

      if (value === '') {
        throw new AppException({ code: ErrorCode.POLICY_INVALID_CONTENT });
      }

      if (typeof value === 'string' && value.length > 5000) {
        throw new AppException({ code: ErrorCode.POLICY_INVALID_CONTENT });
      }
    }

    if (dto.clientReviewPeriodDays === null) {
      throw new AppException({ code: ErrorCode.POLICY_INVALID_REVIEW_PERIOD });
    }

    if (dto.freelancerDelayGraceDays === null) {
      throw new AppException({ code: ErrorCode.POLICY_INVALID_REVIEW_PERIOD });
    }

    if (
      dto.clientReviewPeriodDays !== undefined &&
      (!Number.isInteger(dto.clientReviewPeriodDays) ||
        dto.clientReviewPeriodDays < 1 ||
        dto.clientReviewPeriodDays > 90)
    ) {
      throw new AppException({ code: ErrorCode.POLICY_INVALID_REVIEW_PERIOD });
    }

    if (
      dto.freelancerDelayGraceDays !== undefined &&
      (!Number.isInteger(dto.freelancerDelayGraceDays) ||
        dto.freelancerDelayGraceDays < 0 ||
        dto.freelancerDelayGraceDays > 30)
    ) {
      throw new AppException({ code: ErrorCode.POLICY_INVALID_REVIEW_PERIOD });
    }
  }
}
