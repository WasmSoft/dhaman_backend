import { Injectable } from '@nestjs/common';
import { AgreementStatus } from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { UpdateAgreementPolicyDto } from './dto/agreement-policies.dto';
import { AgreementPolicyResponseDto } from './dto/agreement-policies.dto';

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
}
