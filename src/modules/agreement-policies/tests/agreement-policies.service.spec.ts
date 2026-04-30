import { Test, TestingModule } from '@nestjs/testing';
import { AgreementStatus } from '@prisma/client';
import { ClsService } from '../../../common/cls/cls.service';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AgreementPoliciesService } from '../agreement-policies.service';

const FREELANCER_ID = 'freelancer-001';
const AGREEMENT_ID = 'agreement-001';
const POLICY_ID = 'policy-001';
const NOW = new Date('2026-04-30T12:00:00.000Z');

const mockAgreement = {
  id: AGREEMENT_ID,
  freelancerId: FREELANCER_ID,
  status: AgreementStatus.DRAFT,
};

const mockPolicy = {
  id: POLICY_ID,
  agreementId: AGREEMENT_ID,
  delayPolicy: 'delay text',
  cancellationPolicy: null,
  extraRequestPolicy: null,
  reviewPolicy: 'review text',
  clientReviewPeriodDays: 7,
  freelancerDelayGraceDays: 3,
  createdAt: NOW,
  updatedAt: NOW,
};

describe('AgreementPoliciesService', () => {
  let service: AgreementPoliciesService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgreementPoliciesService,
        {
          provide: PrismaService,
          useValue: {
            agreement: { findFirst: jest.fn() },
            agreementPolicy: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
            },
          },
        },
        {
          provide: ClsService,
          useValue: { get: jest.fn().mockReturnValue(FREELANCER_ID) },
        },
      ],
    }).compile();

    service = module.get(AgreementPoliciesService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('getPolicy', () => {
    it('returns the policy when the freelancer owns the agreement and a policy exists', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(mockAgreement);
      (prisma.agreementPolicy.findUnique as jest.Mock).mockResolvedValue(
        mockPolicy,
      );

      const result = await service.getPolicy(AGREEMENT_ID);

      expect(result.id).toBe(POLICY_ID);
      expect(result.agreementId).toBe(AGREEMENT_ID);
      expect(result.delayPolicy).toBe('delay text');
      expect(result.cancellationPolicy).toBeNull();
      expect(result.clientReviewPeriodDays).toBe(7);
      expect(result.createdAt).toBe('2026-04-30T12:00:00.000Z');
    });

    it('throws POLICY_NOT_FOUND when the agreement exists but no policy exists', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(mockAgreement);
      (prisma.agreementPolicy.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getPolicy(AGREEMENT_ID)).rejects.toMatchObject({
        code: ErrorCode.POLICY_NOT_FOUND,
      });
    });

    it('throws AGREEMENT_NOT_FOUND when the agreement does not exist', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getPolicy(AGREEMENT_ID)).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_FOUND,
      });

      expect(prisma.agreementPolicy.findUnique).not.toHaveBeenCalled();
    });

    it('throws UNAUTHORIZED when CLS has no userId', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AgreementPoliciesService,
          {
            provide: PrismaService,
            useValue: {
              agreement: { findFirst: jest.fn() },
              agreementPolicy: { findUnique: jest.fn(), upsert: jest.fn() },
            },
          },
          {
            provide: ClsService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
        ],
      }).compile();

      const unauthService = module.get(AgreementPoliciesService);

      await expect(unauthService.getPolicy(AGREEMENT_ID)).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
      });
    });
  });

  describe('upsertPolicy', () => {
    it('creates a policy with defaults when no fields are provided', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(mockAgreement);
      (prisma.agreementPolicy.upsert as jest.Mock).mockResolvedValue(mockPolicy);

      const result = await service.upsertPolicy(AGREEMENT_ID, {});

      expect(prisma.agreementPolicy.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { agreementId: AGREEMENT_ID },
          create: expect.objectContaining({
            clientReviewPeriodDays: 7,
            freelancerDelayGraceDays: 3,
            delayPolicy: null,
          }),
        }),
      );
      expect(result.clientReviewPeriodDays).toBe(7);
      expect(result.freelancerDelayGraceDays).toBe(3);
    });

    it('updates only the provided fields and preserves omitted fields', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(mockAgreement);
      (prisma.agreementPolicy.upsert as jest.Mock).mockResolvedValue({
        ...mockPolicy,
        clientReviewPeriodDays: 14,
      });

      await service.upsertPolicy(AGREEMENT_ID, { clientReviewPeriodDays: 14 });

      const upsertCall = (prisma.agreementPolicy.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.update).toEqual({ clientReviewPeriodDays: 14 });
      expect(upsertCall.update).not.toHaveProperty('delayPolicy');
      expect(upsertCall.update).not.toHaveProperty('cancellationPolicy');
    });

    it('is idempotent for repeated saves', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(mockAgreement);
      (prisma.agreementPolicy.upsert as jest.Mock).mockResolvedValue(mockPolicy);

      await service.upsertPolicy(AGREEMENT_ID, { clientReviewPeriodDays: 7 });
      await service.upsertPolicy(AGREEMENT_ID, { clientReviewPeriodDays: 7 });

      expect(prisma.agreementPolicy.upsert).toHaveBeenCalledTimes(2);
      const calls = (prisma.agreementPolicy.upsert as jest.Mock).mock.calls;
      expect(calls[0][0].where).toEqual({ agreementId: AGREEMENT_ID });
      expect(calls[1][0].where).toEqual({ agreementId: AGREEMENT_ID });
    });

    it('saves explicit null to clear a policy text field', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(mockAgreement);
      (prisma.agreementPolicy.upsert as jest.Mock).mockResolvedValue({
        ...mockPolicy,
        cancellationPolicy: null,
      });

      const result = await service.upsertPolicy(AGREEMENT_ID, {
        cancellationPolicy: null,
      });

      const upsertCall = (prisma.agreementPolicy.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.update.cancellationPolicy).toBeNull();
      expect(result.cancellationPolicy).toBeNull();
    });

    it('throws AGREEMENT_NOT_FOUND when the agreement does not exist', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.upsertPolicy(AGREEMENT_ID, { clientReviewPeriodDays: 7 }),
      ).rejects.toMatchObject({ code: ErrorCode.AGREEMENT_NOT_FOUND });

      expect(prisma.agreementPolicy.upsert).not.toHaveBeenCalled();
    });

    it('throws AGREEMENT_CANNOT_BE_MODIFIED when the agreement status is not DRAFT', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.SENT,
      });

      await expect(
        service.upsertPolicy(AGREEMENT_ID, { clientReviewPeriodDays: 7 }),
      ).rejects.toMatchObject({ code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED });

      expect(prisma.agreementPolicy.upsert).not.toHaveBeenCalled();
    });

    it('throws POLICY_INVALID_CONTENT when any policy text field is empty', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(mockAgreement);

      for (const key of [
        'delayPolicy',
        'cancellationPolicy',
        'extraRequestPolicy',
        'reviewPolicy',
      ] as const) {
        await expect(service.upsertPolicy(AGREEMENT_ID, { [key]: '' } as any)).rejects.toMatchObject({
          code: ErrorCode.POLICY_INVALID_CONTENT,
        });
      }
      expect(prisma.agreementPolicy.upsert).not.toHaveBeenCalled();
    });

    it('accepts null for policy text fields', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(mockAgreement);
      (prisma.agreementPolicy.upsert as jest.Mock).mockResolvedValue({
        ...mockPolicy,
        delayPolicy: null,
      });

      await expect(service.upsertPolicy(AGREEMENT_ID, { delayPolicy: null })).resolves.toBeDefined();
    });

    it('accepts boundary values for review period and grace days', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(mockAgreement);
      (prisma.agreementPolicy.upsert as jest.Mock).mockResolvedValue(mockPolicy);

      await expect(
        service.upsertPolicy(AGREEMENT_ID, { clientReviewPeriodDays: 1 }),
      ).resolves.toBeDefined();
      await expect(
        service.upsertPolicy(AGREEMENT_ID, { clientReviewPeriodDays: 90 }),
      ).resolves.toBeDefined();
      await expect(
        service.upsertPolicy(AGREEMENT_ID, { freelancerDelayGraceDays: 0 }),
      ).resolves.toBeDefined();
      await expect(
        service.upsertPolicy(AGREEMENT_ID, { freelancerDelayGraceDays: 30 }),
      ).resolves.toBeDefined();
    });
  });
});
