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
              create: jest.fn(),
              upsert: jest.fn(),
            },
            userSettings: { findUnique: jest.fn(), upsert: jest.fn() },
          },
        },
        {
          provide: ClsService,
          useValue: { get: jest.fn().mockReturnValue(FREELANCER_ID) },
        },
      ],
    }).compile();

    service = module.get(AgreementPoliciesService);
    prisma = module.get(PrismaService);
  });

  describe('copyDefaultsToAgreement', () => {
    it('copies saved defaults into a draft agreement without a policy record', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );
      (prisma.agreementPolicy.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
        defaultPolicies: {
          delayPolicy: 'saved delay text',
          cancellationPolicy: 'saved cancellation text',
          extraRequestPolicy: null,
          reviewPolicy: 'saved review text',
          clientReviewPeriodDays: 14,
          freelancerDelayGraceDays: 5,
        },
      });
      (prisma.agreementPolicy.create as jest.Mock).mockResolvedValue({
        id: POLICY_ID,
        agreementId: AGREEMENT_ID,
        delayPolicy: 'saved delay text',
        cancellationPolicy: 'saved cancellation text',
        extraRequestPolicy: null,
        reviewPolicy: 'saved review text',
        clientReviewPeriodDays: 14,
        freelancerDelayGraceDays: 5,
        createdAt: NOW,
        updatedAt: NOW,
      });

      const result = await service.copyDefaultsToAgreement(AGREEMENT_ID);

      expect(prisma.agreementPolicy.create).toHaveBeenCalledWith({
        data: {
          agreementId: AGREEMENT_ID,
          delayPolicy: 'saved delay text',
          cancellationPolicy: 'saved cancellation text',
          extraRequestPolicy: null,
          reviewPolicy: 'saved review text',
          clientReviewPeriodDays: 14,
          freelancerDelayGraceDays: 5,
        },
      });
      expect(result).toMatchObject({
        id: POLICY_ID,
        agreementId: AGREEMENT_ID,
        delayPolicy: 'saved delay text',
        cancellationPolicy: 'saved cancellation text',
        extraRequestPolicy: null,
        reviewPolicy: 'saved review text',
        clientReviewPeriodDays: 14,
        freelancerDelayGraceDays: 5,
      });
    });

    it('falls back to baseline values when no saved defaults exist', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );
      (prisma.agreementPolicy.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userSettings.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.agreementPolicy.create as jest.Mock).mockResolvedValue({
        id: POLICY_ID,
        agreementId: AGREEMENT_ID,
        delayPolicy: null,
        cancellationPolicy: null,
        extraRequestPolicy: null,
        reviewPolicy: null,
        clientReviewPeriodDays: 7,
        freelancerDelayGraceDays: 3,
        createdAt: NOW,
        updatedAt: NOW,
      });

      const result = await service.copyDefaultsToAgreement(AGREEMENT_ID);

      expect(prisma.agreementPolicy.create).toHaveBeenCalledWith({
        data: {
          agreementId: AGREEMENT_ID,
          delayPolicy: null,
          cancellationPolicy: null,
          extraRequestPolicy: null,
          reviewPolicy: null,
          clientReviewPeriodDays: 7,
          freelancerDelayGraceDays: 3,
        },
      });
      expect(result.clientReviewPeriodDays).toBe(7);
      expect(result.freelancerDelayGraceDays).toBe(3);
    });

    it('normalizes malformed saved defaults before creating the policy', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );
      (prisma.agreementPolicy.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
        defaultPolicies: {
          delayPolicy: 123,
          cancellationPolicy: 'cancel text',
          clientReviewPeriodDays: 999,
          freelancerDelayGraceDays: 'bad',
        },
      });
      (prisma.agreementPolicy.create as jest.Mock).mockResolvedValue({
        id: POLICY_ID,
        agreementId: AGREEMENT_ID,
        delayPolicy: null,
        cancellationPolicy: 'cancel text',
        extraRequestPolicy: null,
        reviewPolicy: null,
        clientReviewPeriodDays: 7,
        freelancerDelayGraceDays: 3,
        createdAt: NOW,
        updatedAt: NOW,
      });

      const result = await service.copyDefaultsToAgreement(AGREEMENT_ID);

      expect(prisma.agreementPolicy.create).toHaveBeenCalledWith({
        data: {
          agreementId: AGREEMENT_ID,
          delayPolicy: null,
          cancellationPolicy: 'cancel text',
          extraRequestPolicy: null,
          reviewPolicy: null,
          clientReviewPeriodDays: 7,
          freelancerDelayGraceDays: 3,
        },
      });
      expect(result.delayPolicy).toBeNull();
      expect(result.clientReviewPeriodDays).toBe(7);
    });

    it('returns the existing policy unchanged when one already exists', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );
      (prisma.agreementPolicy.findUnique as jest.Mock).mockResolvedValue(
        mockPolicy,
      );

      const result = await service.copyDefaultsToAgreement(AGREEMENT_ID);

      expect(result.id).toBe(POLICY_ID);
      expect(prisma.userSettings.findUnique).not.toHaveBeenCalled();
      expect(prisma.agreementPolicy.create).not.toHaveBeenCalled();
    });

    it('is safe to call repeatedly for the same agreement', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );
      (prisma.agreementPolicy.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockPolicy);
      (prisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
        defaultPolicies: null,
      });
      (prisma.agreementPolicy.create as jest.Mock).mockResolvedValue(
        mockPolicy,
      );

      await service.copyDefaultsToAgreement(AGREEMENT_ID);
      await service.copyDefaultsToAgreement(AGREEMENT_ID);

      expect(prisma.agreementPolicy.create).toHaveBeenCalledTimes(1);
      expect(prisma.agreementPolicy.findUnique).toHaveBeenCalledTimes(2);
    });

    it('throws AGREEMENT_NOT_FOUND when the agreement does not exist', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.copyDefaultsToAgreement(AGREEMENT_ID),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_FOUND,
      });

      expect(prisma.agreementPolicy.findUnique).not.toHaveBeenCalled();
      expect(prisma.userSettings.findUnique).not.toHaveBeenCalled();
      expect(prisma.agreementPolicy.create).not.toHaveBeenCalled();
    });

    it('throws AGREEMENT_CANNOT_BE_MODIFIED when the agreement is not draft', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.SENT,
      });

      await expect(
        service.copyDefaultsToAgreement(AGREEMENT_ID),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
      });

      expect(prisma.agreementPolicy.findUnique).not.toHaveBeenCalled();
      expect(prisma.userSettings.findUnique).not.toHaveBeenCalled();
      expect(prisma.agreementPolicy.create).not.toHaveBeenCalled();
    });

    it('throws UNAUTHORIZED when CLS has no userId', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AgreementPoliciesService,
          {
            provide: PrismaService,
            useValue: {
              agreement: { findFirst: jest.fn() },
              agreementPolicy: {
                findUnique: jest.fn(),
                create: jest.fn(),
                upsert: jest.fn(),
              },
              userSettings: { findUnique: jest.fn(), upsert: jest.fn() },
            },
          },
          {
            provide: ClsService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
        ],
      }).compile();

      const unauthService = module.get(AgreementPoliciesService);

      await expect(
        unauthService.copyDefaultsToAgreement(AGREEMENT_ID),
      ).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
      });
    });
  });

  describe('getPolicy', () => {
    it('returns the policy when the freelancer owns the agreement and a policy exists', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );
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
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );
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

      await expect(unauthService.getPolicy(AGREEMENT_ID)).rejects.toMatchObject(
        {
          code: ErrorCode.UNAUTHORIZED,
        },
      );
    });
  });

  describe('upsertPolicy', () => {
    it('creates a policy with defaults when no fields are provided', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );
      (prisma.agreementPolicy.upsert as jest.Mock).mockResolvedValue(
        mockPolicy,
      );

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
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );
      (prisma.agreementPolicy.upsert as jest.Mock).mockResolvedValue({
        ...mockPolicy,
        clientReviewPeriodDays: 14,
      });

      await service.upsertPolicy(AGREEMENT_ID, { clientReviewPeriodDays: 14 });

      const upsertCall = (prisma.agreementPolicy.upsert as jest.Mock).mock
        .calls[0][0];
      expect(upsertCall.update).toEqual({ clientReviewPeriodDays: 14 });
      expect(upsertCall.update).not.toHaveProperty('delayPolicy');
      expect(upsertCall.update).not.toHaveProperty('cancellationPolicy');
    });

    it('is idempotent for repeated saves', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );
      (prisma.agreementPolicy.upsert as jest.Mock).mockResolvedValue(
        mockPolicy,
      );

      await service.upsertPolicy(AGREEMENT_ID, { clientReviewPeriodDays: 7 });
      await service.upsertPolicy(AGREEMENT_ID, { clientReviewPeriodDays: 7 });

      expect(prisma.agreementPolicy.upsert).toHaveBeenCalledTimes(2);
      const calls = (prisma.agreementPolicy.upsert as jest.Mock).mock.calls;
      expect(calls[0][0].where).toEqual({ agreementId: AGREEMENT_ID });
      expect(calls[1][0].where).toEqual({ agreementId: AGREEMENT_ID });
    });

    it('saves explicit null to clear a policy text field', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );
      (prisma.agreementPolicy.upsert as jest.Mock).mockResolvedValue({
        ...mockPolicy,
        cancellationPolicy: null,
      });

      const result = await service.upsertPolicy(AGREEMENT_ID, {
        cancellationPolicy: null,
      });

      const upsertCall = (prisma.agreementPolicy.upsert as jest.Mock).mock
        .calls[0][0];
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
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );

      for (const key of [
        'delayPolicy',
        'cancellationPolicy',
        'extraRequestPolicy',
        'reviewPolicy',
      ] as const) {
        await expect(
          service.upsertPolicy(AGREEMENT_ID, { [key]: '' } as any),
        ).rejects.toMatchObject({
          code: ErrorCode.POLICY_INVALID_CONTENT,
        });
      }
      expect(prisma.agreementPolicy.upsert).not.toHaveBeenCalled();
    });

    it('accepts null for policy text fields', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );
      (prisma.agreementPolicy.upsert as jest.Mock).mockResolvedValue({
        ...mockPolicy,
        delayPolicy: null,
      });

      await expect(
        service.upsertPolicy(AGREEMENT_ID, { delayPolicy: null }),
      ).resolves.toBeDefined();
    });

    it('accepts boundary values for review period and grace days', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
        mockAgreement,
      );
      (prisma.agreementPolicy.upsert as jest.Mock).mockResolvedValue(
        mockPolicy,
      );

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

  describe('getDefaultPolicies', () => {
    let defaultService: AgreementPoliciesService;
    let defaultPrisma: jest.Mocked<PrismaService>;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AgreementPoliciesService,
          {
            provide: PrismaService,
            useValue: {
              agreement: { findFirst: jest.fn() },
              agreementPolicy: { findUnique: jest.fn(), upsert: jest.fn() },
              userSettings: { findUnique: jest.fn(), upsert: jest.fn() },
            },
          },
          {
            provide: ClsService,
            useValue: { get: jest.fn().mockReturnValue(FREELANCER_ID) },
          },
        ],
      }).compile();

      defaultService = module.get(AgreementPoliciesService);
      defaultPrisma = module.get(PrismaService);
    });

    it('returns saved default policies when UserSettings has valid defaultPolicies', async () => {
      (defaultPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
        defaultPolicies: {
          delayPolicy: 'delay text',
          cancellationPolicy: null,
          extraRequestPolicy: 'extra text',
          reviewPolicy: null,
          clientReviewPeriodDays: 14,
          freelancerDelayGraceDays: 5,
        },
      });

      const result = await defaultService.getDefaultPolicies();

      expect(result.delayPolicy).toBe('delay text');
      expect(result.cancellationPolicy).toBeNull();
      expect(result.extraRequestPolicy).toBe('extra text');
      expect(result.clientReviewPeriodDays).toBe(14);
      expect(result.freelancerDelayGraceDays).toBe(5);
    });

    it('returns fallback values when UserSettings is missing', async () => {
      (defaultPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await defaultService.getDefaultPolicies();

      expect(result).toEqual({
        delayPolicy: null,
        cancellationPolicy: null,
        extraRequestPolicy: null,
        reviewPolicy: null,
        clientReviewPeriodDays: 7,
        freelancerDelayGraceDays: 3,
      });
    });

    it('normalizes malformed saved data to fallback values', async () => {
      (defaultPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
        defaultPolicies: {
          delayPolicy: 123,
          cancellationPolicy: 'cancel',
          clientReviewPeriodDays: 999,
          freelancerDelayGraceDays: 'bad',
        },
      });

      const result = await defaultService.getDefaultPolicies();

      expect(result.delayPolicy).toBeNull();
      expect(result.cancellationPolicy).toBe('cancel');
      expect(result.clientReviewPeriodDays).toBe(7);
      expect(result.freelancerDelayGraceDays).toBe(3);
    });
  });

  describe('updateDefaultPolicies', () => {
    let defaultService: AgreementPoliciesService;
    let defaultPrisma: jest.Mocked<PrismaService>;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AgreementPoliciesService,
          {
            provide: PrismaService,
            useValue: {
              agreement: { findFirst: jest.fn() },
              agreementPolicy: { findUnique: jest.fn(), upsert: jest.fn() },
              userSettings: { findUnique: jest.fn(), upsert: jest.fn() },
            },
          },
          {
            provide: ClsService,
            useValue: { get: jest.fn().mockReturnValue(FREELANCER_ID) },
          },
        ],
      }).compile();

      defaultService = module.get(AgreementPoliciesService);
      defaultPrisma = module.get(PrismaService);
    });

    it('creates settings and returns merged defaults on first save', async () => {
      (defaultPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      (defaultPrisma.userSettings.upsert as jest.Mock).mockResolvedValue({
        defaultPolicies: {
          delayPolicy: 'first delay text',
          cancellationPolicy: null,
          extraRequestPolicy: null,
          reviewPolicy: null,
          clientReviewPeriodDays: 10,
          freelancerDelayGraceDays: 3,
        },
      });

      const result = await defaultService.updateDefaultPolicies({
        delayPolicy: 'first delay text',
        clientReviewPeriodDays: 10,
      });

      expect(defaultPrisma.userSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: FREELANCER_ID },
          create: expect.objectContaining({ userId: FREELANCER_ID }),
        }),
      );
      expect(result.delayPolicy).toBe('first delay text');
      expect(result.clientReviewPeriodDays).toBe(10);
      expect(result.freelancerDelayGraceDays).toBe(3);
    });

    it('merges provided field over existing defaults and preserves omitted fields', async () => {
      (defaultPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
        defaultPolicies: {
          delayPolicy: 'existing delay text',
          cancellationPolicy: 'existing cancel text',
          extraRequestPolicy: null,
          reviewPolicy: null,
          clientReviewPeriodDays: 14,
          freelancerDelayGraceDays: 5,
        },
      });
      (defaultPrisma.userSettings.upsert as jest.Mock).mockResolvedValue({
        defaultPolicies: {
          delayPolicy: 'existing delay text',
          cancellationPolicy: 'updated cancel text',
          extraRequestPolicy: null,
          reviewPolicy: null,
          clientReviewPeriodDays: 14,
          freelancerDelayGraceDays: 5,
        },
      });

      const result = await defaultService.updateDefaultPolicies({
        cancellationPolicy: 'updated cancel text',
      });

      expect(result.cancellationPolicy).toBe('updated cancel text');
      expect(result.delayPolicy).toBe('existing delay text');
      expect(result.clientReviewPeriodDays).toBe(14);
      expect(result.freelancerDelayGraceDays).toBe(5);
    });

    it('clears a text field when null is provided explicitly', async () => {
      (defaultPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
        defaultPolicies: {
          delayPolicy: 'had text',
          cancellationPolicy: null,
          extraRequestPolicy: null,
          reviewPolicy: null,
          clientReviewPeriodDays: 7,
          freelancerDelayGraceDays: 3,
        },
      });
      (defaultPrisma.userSettings.upsert as jest.Mock).mockResolvedValue({
        defaultPolicies: {
          delayPolicy: null,
          cancellationPolicy: null,
          extraRequestPolicy: null,
          reviewPolicy: null,
          clientReviewPeriodDays: 7,
          freelancerDelayGraceDays: 3,
        },
      });

      const result = await defaultService.updateDefaultPolicies({
        delayPolicy: null,
      });

      expect(result.delayPolicy).toBeNull();
      const upsertCall = (defaultPrisma.userSettings.upsert as jest.Mock).mock
        .calls[0][0];
      expect(
        (upsertCall.update.defaultPolicies as Record<string, unknown>)
          .delayPolicy,
      ).toBeNull();
    });

    it('returns current template without writing when body is empty', async () => {
      (defaultPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
        defaultPolicies: {
          delayPolicy: 'saved text',
          cancellationPolicy: null,
          extraRequestPolicy: null,
          reviewPolicy: null,
          clientReviewPeriodDays: 7,
          freelancerDelayGraceDays: 3,
        },
      });

      const result = await defaultService.updateDefaultPolicies({});

      expect(defaultPrisma.userSettings.upsert).not.toHaveBeenCalled();
      expect(result.delayPolicy).toBe('saved text');
    });

    it('throws POLICY_INVALID_CONTENT when any text field is an empty string', async () => {
      for (const key of [
        'delayPolicy',
        'cancellationPolicy',
        'extraRequestPolicy',
        'reviewPolicy',
      ] as const) {
        await expect(
          defaultService.updateDefaultPolicies({ [key]: '' }),
        ).rejects.toMatchObject({ code: ErrorCode.POLICY_INVALID_CONTENT });
      }

      expect(defaultPrisma.userSettings.upsert).not.toHaveBeenCalled();
    });

    it('throws POLICY_INVALID_REVIEW_PERIOD when a numeric field is null', async () => {
      await expect(
        defaultService.updateDefaultPolicies({
          clientReviewPeriodDays: null,
        } as never),
      ).rejects.toMatchObject({ code: ErrorCode.POLICY_INVALID_REVIEW_PERIOD });

      await expect(
        defaultService.updateDefaultPolicies({
          freelancerDelayGraceDays: null,
        } as never),
      ).rejects.toMatchObject({ code: ErrorCode.POLICY_INVALID_REVIEW_PERIOD });

      expect(defaultPrisma.userSettings.upsert).not.toHaveBeenCalled();
    });
  });
});
