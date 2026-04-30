import { Test, TestingModule } from '@nestjs/testing';
import {
  AgreementStatus,
  TimelineActorRole,
  TimelineEventType,
  PaymentStatus as PrismaPaymentStatus,
} from '@prisma/client';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ClsService } from '../../../common/cls/cls.service';
import { ClientsService } from '../../clients/clients.service';
import { TimelineEventsService } from '../../timeline-events/timeline-events.service';
import { EmailNotificationsService } from '../../email-notifications/email-notifications.service';
import { AgreementsService } from '../agreements.service';

const FREELANCER_ID = 'freelancer-001';
const AGREEMENT_ID = 'agreement-001';

const mockClient = {
  id: 'client-001',
  name: 'Test Client',
  email: 'client@test.com',
};
const mockPolicy = { id: 'policy-001', agreementId: AGREEMENT_ID };
const mockMilestone = {
  id: 'milestone-001',
  agreementId: AGREEMENT_ID,
  amount: { toNumber: () => 1000, valueOf: () => 1000 },
  order: 1,
};

const makeDraftAgreement = (
  overrides: Partial<Record<string, unknown>> = {},
) => ({
  id: AGREEMENT_ID,
  freelancerId: FREELANCER_ID,
  title: 'Test Agreement',
  status: AgreementStatus.DRAFT,
  totalAmount: { toNumber: () => 1000, valueOf: () => 1000 },
  clientId: mockClient.id,
  client: mockClient,
  milestones: [mockMilestone],
  policy: mockPolicy,
  ...overrides,
});

describe('AgreementsService.sendInvite', () => {
  let service: AgreementsService;
  let prisma: jest.Mocked<PrismaService>;
  let timelineEvents: jest.Mocked<TimelineEventsService>;
  let emailNotifications: jest.Mocked<EmailNotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgreementsService,
        {
          provide: PrismaService,
          useValue: {
            agreement: { findFirst: jest.fn(), update: jest.fn() },
            milestone: { aggregate: jest.fn() },
            userSettings: { findFirst: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: ClsService,
          useValue: { get: jest.fn().mockReturnValue(FREELANCER_ID) },
        },
        {
          provide: ClientsService,
          useValue: { getById: jest.fn() },
        },
        {
          provide: TimelineEventsService,
          useValue: { createEvent: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: EmailNotificationsService,
          useValue: {
            enqueueAgreementInvite: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AgreementsService>(AgreementsService);
    prisma = module.get(PrismaService);
    timelineEvents = module.get(TimelineEventsService);
    emailNotifications = module.get(EmailNotificationsService);
  });

  function setupTransaction(updatedAgreement: unknown) {
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          agreement: { update: jest.fn().mockResolvedValue(updatedAgreement) },
        };
        await fn(tx);
        return updatedAgreement;
      },
    );
  }

  function setupMilestoneSum(sum: number) {
    (prisma.milestone.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: sum },
    });
  }

  it('returns AGREEMENT_NOT_FOUND when agreement does not exist', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.sendInvite(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_NOT_FOUND,
    });
  });

  it('returns AGREEMENT_NOT_FOUND when agreement belongs to another freelancer', async () => {
    // findFirst returns null when freelancerId filter does not match
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.sendInvite(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_NOT_FOUND,
    });
  });

  it('returns AGREEMENT_ALREADY_SENT when status is SENT', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement({ status: AgreementStatus.SENT }),
    );
    await expect(service.sendInvite(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_ALREADY_SENT,
    });
  });

  it('returns AGREEMENT_ALREADY_SENT when status is ACTIVE', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement({ status: AgreementStatus.ACTIVE }),
    );
    await expect(service.sendInvite(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_ALREADY_SENT,
    });
  });

  it('returns AGREEMENT_CLIENT_REQUIRED when client is not linked', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement({ clientId: null, client: null }),
    );
    await expect(service.sendInvite(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_CLIENT_REQUIRED,
    });
  });

  it('returns VALIDATION_ERROR when no milestones exist', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement({ milestones: [] }),
    );
    await expect(service.sendInvite(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    });
  });

  it('returns AGREEMENT_POLICY_REQUIRED when policy does not exist', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement({ policy: null }),
    );
    await expect(service.sendInvite(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_POLICY_REQUIRED,
    });
  });

  it('returns PAYMENT_INVALID_AMOUNT when totalAmount does not match milestone sum', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement(),
    );
    setupMilestoneSum(500); // agreement has 1000 but milestones sum to 500
    await expect(service.sendInvite(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.PAYMENT_INVALID_AMOUNT,
    });
  });

  it('transitions agreement to SENT on success', async () => {
    const agreement = makeDraftAgreement();
    const updatedAgreement = {
      ...agreement,
      status: AgreementStatus.SENT,
      sentAt: new Date(),
      inviteToken: 'x'.repeat(64),
      portalToken: 'y'.repeat(64),
    };
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);
    setupMilestoneSum(1000);
    setupTransaction(updatedAgreement);

    const result = await service.sendInvite(AGREEMENT_ID);

    expect(result.status).toBe(AgreementStatus.SENT);
    expect(result.sentAt).not.toBeNull();
  });

  it('generates 64-character inviteToken and portalToken', async () => {
    const agreement = makeDraftAgreement();
    let capturedInviteToken = '';
    let capturedPortalToken = '';

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);
    setupMilestoneSum(1000);
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
      const tx = {
        agreement: {
          update: jest.fn().mockImplementation(({ data }) => {
            capturedInviteToken = data.inviteToken;
            capturedPortalToken = data.portalToken;
            return {
              ...agreement,
              status: 'SENT',
              sentAt: new Date(),
              inviteToken: data.inviteToken,
              portalToken: data.portalToken,
            };
          }),
        },
      };
      return await fn(tx);
    });

    await service.sendInvite(AGREEMENT_ID);

    expect(capturedInviteToken).toHaveLength(64);
    expect(capturedPortalToken).toHaveLength(64);
    expect(capturedInviteToken).not.toBe(capturedPortalToken);
  });

  it('creates AGREEMENT_SENT timeline event inside the transaction', async () => {
    const agreement = makeDraftAgreement();
    const updatedAgreement = {
      ...agreement,
      status: 'SENT',
      sentAt: new Date(),
      inviteToken: 'a'.repeat(64),
      portalToken: 'b'.repeat(64),
    };
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);
    setupMilestoneSum(1000);
    setupTransaction(updatedAgreement);

    await service.sendInvite(AGREEMENT_ID);

    expect(timelineEvents.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId: AGREEMENT_ID,
        type: TimelineEventType.AGREEMENT_SENT,
        actorRole: TimelineActorRole.FREELANCER,
      }),
      expect.anything(), // tx client
    );
  });

  it('calls enqueueAgreementInvite with client email after transaction commits', async () => {
    const agreement = makeDraftAgreement();
    const updatedAgreement = {
      ...agreement,
      status: 'SENT',
      sentAt: new Date(),
      inviteToken: 'c'.repeat(64),
      portalToken: 'd'.repeat(64),
    };
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);
    setupMilestoneSum(1000);
    setupTransaction(updatedAgreement);

    await service.sendInvite(AGREEMENT_ID);

    expect(emailNotifications.enqueueAgreementInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId: AGREEMENT_ID,
        recipientEmail: mockClient.email,
      }),
    );
  });

  it('returns SENT agreement even when email enqueue fails', async () => {
    const agreement = makeDraftAgreement();
    const updatedAgreement = {
      ...agreement,
      status: 'SENT',
      sentAt: new Date(),
      inviteToken: 'e'.repeat(64),
      portalToken: 'f'.repeat(64),
    };
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);
    setupMilestoneSum(1000);
    setupTransaction(updatedAgreement);
    (emailNotifications.enqueueAgreementInvite as jest.Mock).mockRejectedValue(
      new Error('SMTP unavailable'),
    );

    const result = await service.sendInvite(AGREEMENT_ID);

    expect(result.status).toBe(AgreementStatus.SENT);
  });

  it('does not call enqueueAgreementInvite when validation fails', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement({ clientId: null, client: null }),
    );
    await expect(service.sendInvite(AGREEMENT_ID)).rejects.toBeDefined();
    expect(emailNotifications.enqueueAgreementInvite).not.toHaveBeenCalled();
  });
});

describe('AgreementsService.activate', () => {
  let service: AgreementsService;
  let prisma: jest.Mocked<PrismaService>;
  let timelineEvents: jest.Mocked<TimelineEventsService>;
  let emailNotifications: jest.Mocked<EmailNotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgreementsService,
        {
          provide: PrismaService,
          useValue: {
            agreement: { findFirst: jest.fn(), update: jest.fn() },
            milestone: { aggregate: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
            payment: { findMany: jest.fn(), updateMany: jest.fn() },
            userSettings: { findFirst: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: ClsService,
          useValue: { get: jest.fn().mockReturnValue(FREELANCER_ID) },
        },
        {
          provide: ClientsService,
          useValue: { getById: jest.fn() },
        },
        {
          provide: TimelineEventsService,
          useValue: { createEvent: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: EmailNotificationsService,
          useValue: {
            enqueueAgreementInvite: jest.fn().mockResolvedValue(undefined),
            enqueueAgreementActivatedForClient: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AgreementsService>(AgreementsService);
    prisma = module.get(PrismaService);
    timelineEvents = module.get(TimelineEventsService);
    emailNotifications = module.get(EmailNotificationsService);
  });

  function setupActivateTransaction({
    mockTx,
    updatedAgreement,
  }: {
    mockTx: Record<string, unknown>;
    updatedAgreement: unknown;
  }) {
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        return await fn(mockTx);
      },
    );
  }

  it('returns AGREEMENT_NOT_FOUND when agreement does not exist', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.activate(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_NOT_FOUND,
    });
  });

  it('returns AGREEMENT_NOT_FOUND when agreement belongs to another freelancer', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.activate(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_NOT_FOUND,
    });
  });

  it('returns AGREEMENT_CANNOT_BE_MODIFIED for DRAFT status', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement({ status: AgreementStatus.DRAFT }),
    );
    await expect(service.activate(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
    });
  });

  it('returns AGREEMENT_CANNOT_BE_MODIFIED for SENT status', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement({ status: AgreementStatus.SENT }),
    );
    await expect(service.activate(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
    });
  });

  it('returns AGREEMENT_CANNOT_BE_MODIFIED for ACTIVE status', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement({ status: AgreementStatus.ACTIVE }),
    );
    await expect(service.activate(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
    });
  });

  it('returns AGREEMENT_CANNOT_BE_MODIFIED for COMPLETED status', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement({ status: AgreementStatus.COMPLETED }),
    );
    await expect(service.activate(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
    });
  });

  it('returns AGREEMENT_CANNOT_BE_MODIFIED for CANCELLED status', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement({ status: AgreementStatus.CANCELLED }),
    );
    await expect(service.activate(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
    });
  });

  it('returns AGREEMENT_CANNOT_BE_MODIFIED for DISPUTED status', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement({ status: AgreementStatus.DISPUTED }),
    );
    await expect(service.activate(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
    });
  });

  it('activates agreement and first DRAFT milestone inside transaction', async () => {
    const draftMilestone = { ...mockMilestone, status: 'DRAFT' };
    const activeMilestone = { ...mockMilestone, status: 'ACTIVE' };
    const agreement = makeDraftAgreement({
      status: AgreementStatus.APPROVED,
      milestones: [
        { ...draftMilestone, order: 1, id: 'm1' },
        { ...draftMilestone, order: 2, id: 'm2', status: 'DRAFT' },
      ],
    });
    const activatedAgreement = {
      ...agreement,
      status: AgreementStatus.ACTIVE,
    };

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

    const tx = {
      agreement: {
        update: jest.fn().mockResolvedValue(activatedAgreement),
      },
      milestone: {
        findFirst: jest.fn().mockResolvedValue({ ...draftMilestone, order: 1, id: 'm1' }),
        update: jest.fn().mockResolvedValue(activeMilestone),
      },
    };
    setupActivateTransaction({ mockTx: tx, updatedAgreement: activatedAgreement });

    const result = await service.activate(AGREEMENT_ID);

    expect(tx.agreement.update).toHaveBeenCalledWith({
      where: { id: AGREEMENT_ID },
      data: { status: 'ACTIVE' },
      include: {
        client: true,
        milestones: { orderBy: { order: 'asc' } },
        policy: true,
      },
    });
    expect(tx.milestone.findFirst).toHaveBeenCalledWith({
      where: { agreementId: AGREEMENT_ID, status: 'DRAFT' },
      orderBy: { order: 'asc' },
    });
    expect(tx.milestone.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { status: 'ACTIVE' },
    });
    expect(result.status).toBe(AgreementStatus.ACTIVE);
  });

  it('activates agreement without changing milestones when no DRAFT milestone exists', async () => {
    const agreement = makeDraftAgreement({
      status: AgreementStatus.APPROVED,
      milestones: [{ ...mockMilestone, status: 'ACTIVE', order: 1 }],
    });
    const activatedAgreement = {
      ...agreement,
      status: AgreementStatus.ACTIVE,
    };

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

    const tx = {
      agreement: { update: jest.fn().mockResolvedValue(activatedAgreement) },
      milestone: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
    };
    setupActivateTransaction({ mockTx: tx, updatedAgreement: activatedAgreement });

    const result = await service.activate(AGREEMENT_ID);

    expect(result.status).toBe(AgreementStatus.ACTIVE);
    expect(tx.milestone.update).not.toHaveBeenCalled();
  });

  it('creates AGREEMENT_ACTIVATED timeline event with bilingual metadata', async () => {
    const agreement = makeDraftAgreement({
      status: AgreementStatus.APPROVED,
    });
    const activatedAgreement = {
      ...agreement,
      status: AgreementStatus.ACTIVE,
    };

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

    const tx = {
      agreement: { update: jest.fn().mockResolvedValue(activatedAgreement) },
      milestone: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
    };
    setupActivateTransaction({ mockTx: tx, updatedAgreement: activatedAgreement });

    await service.activate(AGREEMENT_ID);

    expect(timelineEvents.createEvent).toHaveBeenCalledTimes(1);
    expect(timelineEvents.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId: AGREEMENT_ID,
        type: TimelineEventType.AGREEMENT_ACTIVATED,
        actorRole: TimelineActorRole.FREELANCER,
        actorId: FREELANCER_ID,
        title: 'Agreement activated',
        description: 'Agreement activated; work begins.',
        metadata: {
          titleEn: 'Agreement activated',
          titleAr: 'تم تفعيل الاتفاقية',
          descriptionEn: 'Agreement activated; work begins.',
          descriptionAr: 'تم تفعيل الاتفاقية وبدأ العمل.',
        },
      }),
      expect.anything(),
    );
  });

  it('enqueues activation notification after transaction commits', async () => {
    const agreement = makeDraftAgreement({
      status: AgreementStatus.APPROVED,
    });
    const activatedAgreement = {
      ...agreement,
      status: AgreementStatus.ACTIVE,
    };

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

    const tx = {
      agreement: { update: jest.fn().mockResolvedValue(activatedAgreement) },
      milestone: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
    };
    setupActivateTransaction({ mockTx: tx, updatedAgreement: activatedAgreement });

    await service.activate(AGREEMENT_ID);

    expect(emailNotifications.enqueueAgreementActivatedForClient).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId: AGREEMENT_ID,
        recipientEmail: 'client@test.com',
        agreementTitle: 'Test Agreement',
      }),
    );
  });

  it('returns ACTIVE agreement even when notification enqueue fails', async () => {
    const agreement = makeDraftAgreement({
      status: AgreementStatus.APPROVED,
    });
    const activatedAgreement = {
      ...agreement,
      status: AgreementStatus.ACTIVE,
    };

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

    const tx = {
      agreement: { update: jest.fn().mockResolvedValue(activatedAgreement) },
      milestone: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
    };
    setupActivateTransaction({ mockTx: tx, updatedAgreement: activatedAgreement });
    (emailNotifications.enqueueAgreementActivatedForClient as jest.Mock).mockRejectedValue(
      new Error('SMTP unavailable'),
    );

    const result = await service.activate(AGREEMENT_ID);

    expect(result.status).toBe(AgreementStatus.ACTIVE);
  });

  it('does not call notification when client email is missing', async () => {
    const agreement = makeDraftAgreement({
      status: AgreementStatus.APPROVED,
      client: { ...mockClient, email: '' },
    });
    const activatedAgreement = {
      ...agreement,
      status: AgreementStatus.ACTIVE,
    };

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

    const tx = {
      agreement: { update: jest.fn().mockResolvedValue(activatedAgreement) },
      milestone: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
    };
    setupActivateTransaction({ mockTx: tx, updatedAgreement: activatedAgreement });

    await service.activate(AGREEMENT_ID);

    expect(emailNotifications.enqueueAgreementActivatedForClient).not.toHaveBeenCalled();
  });
});

describe('AgreementsService.archive', () => {
  let service: AgreementsService;
  let prisma: jest.Mocked<PrismaService>;
  let timelineEvents: jest.Mocked<TimelineEventsService>;
  let emailNotifications: jest.Mocked<EmailNotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgreementsService,
        {
          provide: PrismaService,
          useValue: {
            agreement: { findFirst: jest.fn(), update: jest.fn() },
            milestone: { aggregate: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
            payment: { findMany: jest.fn(), updateMany: jest.fn() },
            userSettings: { findFirst: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: ClsService,
          useValue: { get: jest.fn().mockReturnValue(FREELANCER_ID) },
        },
        {
          provide: ClientsService,
          useValue: { getById: jest.fn() },
        },
        {
          provide: TimelineEventsService,
          useValue: { createEvent: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: EmailNotificationsService,
          useValue: {
            enqueueAgreementInvite: jest.fn().mockResolvedValue(undefined),
            enqueueAgreementActivatedForClient: jest.fn().mockResolvedValue(undefined),
            enqueueAgreementCancelledForClient: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AgreementsService>(AgreementsService);
    prisma = module.get(PrismaService);
    timelineEvents = module.get(TimelineEventsService);
    emailNotifications = module.get(EmailNotificationsService);
  });

  function setupArchiveTransaction(mockTx: Record<string, unknown>) {
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        return await fn(mockTx);
      },
    );
  }

  const statusesAllowed = [
    AgreementStatus.DRAFT,
    AgreementStatus.SENT,
    AgreementStatus.APPROVED,
    AgreementStatus.ACTIVE,
    AgreementStatus.CANCELLED,
    AgreementStatus.DISPUTED,
  ];

  statusesAllowed.forEach((status) => {
    it(`returns CANCELLED for ${status} agreement`, async () => {
      const agreement = makeDraftAgreement({ status });
      const cancelledAgreement = { ...agreement, status: AgreementStatus.CANCELLED };

      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

      const tx = {
        agreement: {
          update: jest.fn().mockResolvedValue(cancelledAgreement),
        },
        milestone: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        payment: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };
      setupArchiveTransaction(tx);

      const result = await service.archive(AGREEMENT_ID);

      expect(result.status).toBe(AgreementStatus.CANCELLED);
    });
  });

  it('returns AGREEMENT_CANNOT_BE_MODIFIED for COMPLETED status', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(
      makeDraftAgreement({ status: AgreementStatus.COMPLETED }),
    );
    await expect(service.archive(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
    });
  });

  it('returns AGREEMENT_NOT_FOUND for foreign agreement', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.archive(AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_NOT_FOUND,
    });
  });

  it('preserves ACCEPTED milestones and cancels non-ACCEPTED ones', async () => {
    const agreement = makeDraftAgreement({
      status: AgreementStatus.ACTIVE,
      milestones: [
        { ...mockMilestone, id: 'm1', status: 'ACCEPTED', order: 1 },
        { ...mockMilestone, id: 'm2', status: 'ACTIVE', order: 2 },
        { ...mockMilestone, id: 'm3', status: 'DRAFT', order: 3 },
      ],
    });
    const cancelledAgreement = { ...agreement, status: AgreementStatus.CANCELLED };

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

    const tx = {
      agreement: { update: jest.fn().mockResolvedValue(cancelledAgreement) },
      milestone: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    setupArchiveTransaction(tx);

    await service.archive(AGREEMENT_ID);

    expect(tx.milestone.updateMany).toHaveBeenCalledWith({
      where: {
        agreementId: AGREEMENT_ID,
        status: { not: 'ACCEPTED' },
      },
      data: { status: 'CANCELLED' },
    });
  });

  it('runs payment cascade only for ACTIVE pre-archive status', async () => {
    const agreement = makeDraftAgreement({
      status: AgreementStatus.ACTIVE,
      milestones: [
        { ...mockMilestone, id: 'm1', status: 'ACCEPTED', order: 1 },
        { ...mockMilestone, id: 'm2', status: 'ACTIVE', order: 2 },
      ],
    });
    const cancelledAgreement = { ...agreement, status: AgreementStatus.CANCELLED };

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

    const updateManyMock = jest.fn().mockResolvedValue({ count: 0 });

    const tx = {
      agreement: { update: jest.fn().mockResolvedValue(cancelledAgreement) },
      milestone: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        updateMany: updateManyMock,
      },
    };
    setupArchiveTransaction(tx);

    await service.archive(AGREEMENT_ID);

    expect(updateManyMock).toHaveBeenCalledTimes(2);
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        agreementId: AGREEMENT_ID,
        milestoneId: { in: ['m2'] },
        status: { in: ['WAITING', 'FAILED'] },
      },
      data: { status: 'NOT_REQUIRED' },
    });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        agreementId: AGREEMENT_ID,
        milestoneId: { in: ['m2'] },
        status: { in: ['RESERVED', 'CLIENT_REVIEW', 'AI_REVIEW', 'READY_TO_RELEASE', 'ON_HOLD'] },
      },
      data: { status: 'REFUNDED' },
    });
  });

  it('does not run payment cascade for non-ACTIVE pre-archive status', async () => {
    const agreement = makeDraftAgreement({
      status: AgreementStatus.SENT,
    });
    const cancelledAgreement = { ...agreement, status: AgreementStatus.CANCELLED };

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

    const tx = {
      agreement: { update: jest.fn().mockResolvedValue(cancelledAgreement) },
      milestone: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    setupArchiveTransaction(tx);

    await service.archive(AGREEMENT_ID);

    expect(tx.payment).toBeUndefined();
  });

  it('creates AGREEMENT_CANCELLED timeline event with bilingual metadata', async () => {
    const agreement = makeDraftAgreement({
      status: AgreementStatus.ACTIVE,
    });
    const cancelledAgreement = { ...agreement, status: AgreementStatus.CANCELLED };

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

    const tx = {
      agreement: { update: jest.fn().mockResolvedValue(cancelledAgreement) },
      milestone: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    setupArchiveTransaction(tx);

    await service.archive(AGREEMENT_ID);

    expect(timelineEvents.createEvent).toHaveBeenCalledTimes(1);
    expect(timelineEvents.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId: AGREEMENT_ID,
        type: TimelineEventType.AGREEMENT_CANCELLED,
        actorRole: TimelineActorRole.FREELANCER,
        actorId: FREELANCER_ID,
        title: 'Agreement cancelled',
        description: 'Agreement cancelled; unfinished work stopped.',
        metadata: {
          titleEn: 'Agreement cancelled',
          titleAr: 'تم إلغاء الاتفاقية',
          descriptionEn: 'Agreement cancelled; unfinished work stopped.',
          descriptionAr: 'تم إلغاء الاتفاقية وإيقاف العمل غير المكتمل.',
        },
      }),
      expect.anything(),
    );
  });

  it('enqueues cancellation notification for visible status agreements', async () => {
    const visibleStatuses = [
      AgreementStatus.SENT,
      AgreementStatus.APPROVED,
      AgreementStatus.ACTIVE,
      AgreementStatus.CANCELLED,
      AgreementStatus.DISPUTED,
    ];

    for (const status of visibleStatuses) {
      jest.clearAllMocks();
      const agreement = makeDraftAgreement({ status });
      const cancelledAgreement = { ...agreement, status: AgreementStatus.CANCELLED };

      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

      const tx = {
        agreement: { update: jest.fn().mockResolvedValue(cancelledAgreement) },
        milestone: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        payment: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };
      setupArchiveTransaction(tx);

      await service.archive(AGREEMENT_ID);

      expect(emailNotifications.enqueueAgreementCancelledForClient).toHaveBeenCalledWith(
        expect.objectContaining({
          agreementId: AGREEMENT_ID,
          recipientEmail: 'client@test.com',
        }),
      );
    }
  });

  it('does not enqueue notification for DRAFT archive', async () => {
    const agreement = makeDraftAgreement({
      status: AgreementStatus.DRAFT,
    });
    const cancelledAgreement = { ...agreement, status: AgreementStatus.CANCELLED };

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

    const tx = {
      agreement: { update: jest.fn().mockResolvedValue(cancelledAgreement) },
      milestone: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    setupArchiveTransaction(tx);

    await service.archive(AGREEMENT_ID);

    expect(emailNotifications.enqueueAgreementCancelledForClient).not.toHaveBeenCalled();
  });

  it('returns CANCELLED agreement even when notification enqueue fails', async () => {
    const agreement = makeDraftAgreement({
      status: AgreementStatus.SENT,
    });
    const cancelledAgreement = { ...agreement, status: AgreementStatus.CANCELLED };

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(agreement);

    const tx = {
      agreement: { update: jest.fn().mockResolvedValue(cancelledAgreement) },
      milestone: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    setupArchiveTransaction(tx);
    (emailNotifications.enqueueAgreementCancelledForClient as jest.Mock).mockRejectedValue(
      new Error('SMTP unavailable'),
    );

    const result = await service.archive(AGREEMENT_ID);

    expect(result.status).toBe(AgreementStatus.CANCELLED);
  });
});

describe('AgreementsService helper methods', () => {
  let service: AgreementsService;
  let clsService: { get: jest.Mock };

  beforeEach(async () => {
    clsService = { get: jest.fn().mockReturnValue(FREELANCER_ID) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgreementsService,
        {
          provide: PrismaService,
          useValue: {
            agreement: { findFirst: jest.fn(), update: jest.fn() },
            milestone: { aggregate: jest.fn(), findMany: jest.fn() },
            userSettings: { findFirst: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        { provide: ClsService, useValue: clsService },
        { provide: ClientsService, useValue: { getById: jest.fn() } },
        { provide: TimelineEventsService, useValue: { createEvent: jest.fn() } },
        {
          provide: EmailNotificationsService,
          useValue: {
            enqueueAgreementInvite: jest.fn(),
            enqueueAgreementActivatedForClient: jest.fn(),
            enqueueAgreementCancelledForClient: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AgreementsService);
  });

  function makeTx() {
    return {
      agreement: { findFirst: jest.fn(), update: jest.fn() },
      milestone: { aggregate: jest.fn(), findMany: jest.fn() },
    } as any;
  }

  it('recalculates draft totals from milestone sums', async () => {
    const tx = makeTx();
    tx.agreement.findFirst.mockResolvedValue({ id: AGREEMENT_ID, freelancerId: FREELANCER_ID, status: AgreementStatus.DRAFT });
    tx.milestone.aggregate.mockResolvedValue({ _sum: { amount: 1250 } });
    tx.agreement.update.mockResolvedValue({ id: AGREEMENT_ID, totalAmount: 1250 });

    const result = await service.recalculateTotalAmount(tx, AGREEMENT_ID);

    expect(tx.agreement.update).toHaveBeenCalledWith({
      where: { id: AGREEMENT_ID },
      data: { totalAmount: 1250 },
    });
    expect(result).toEqual({ agreementId: AGREEMENT_ID, totalAmount: 1250 });
  });

  it('recalculates zero totals when no milestones exist', async () => {
    const tx = makeTx();
    tx.agreement.findFirst.mockResolvedValue({ id: AGREEMENT_ID, freelancerId: FREELANCER_ID, status: AgreementStatus.DRAFT });
    tx.milestone.aggregate.mockResolvedValue({ _sum: { amount: null } });
    tx.agreement.update.mockResolvedValue({ id: AGREEMENT_ID, totalAmount: 0 });

    const result = await service.recalculateTotalAmount(tx, AGREEMENT_ID);

    expect(result.totalAmount).toBe(0);
  });

  it('rejects recalculation for non-draft agreements', async () => {
    const tx = makeTx();
    tx.agreement.findFirst.mockResolvedValue({ id: AGREEMENT_ID, freelancerId: FREELANCER_ID, status: AgreementStatus.ACTIVE });

    await expect(service.recalculateTotalAmount(tx, AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
    });
  });

  it('rejects recalculation without CLS userId', async () => {
    clsService.get.mockReturnValueOnce(null);
    const tx = makeTx();

    await expect(service.recalculateTotalAmount(tx, AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.UNAUTHORIZED,
    });
  });

  it('rejects recalculation for foreign agreements', async () => {
    const tx = makeTx();
    tx.agreement.findFirst.mockResolvedValue(null);

    await expect(service.recalculateTotalAmount(tx, AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_NOT_FOUND,
    });
  });

  it('completes active agreements when all milestones are accepted and released', async () => {
    const tx = makeTx();
    tx.agreement.findFirst.mockResolvedValue({ id: AGREEMENT_ID, freelancerId: FREELANCER_ID, status: AgreementStatus.ACTIVE });
    tx.milestone.findMany.mockResolvedValue([
      { status: 'ACCEPTED', paymentStatus: PrismaPaymentStatus.RELEASED },
      { status: 'ACCEPTED', paymentStatus: PrismaPaymentStatus.RELEASED },
    ]);
    tx.agreement.update.mockResolvedValue({ id: AGREEMENT_ID, status: AgreementStatus.COMPLETED });

    const result = await service.checkCompletionStatus(tx, AGREEMENT_ID);

    expect(result).toEqual({
      agreementId: AGREEMENT_ID,
      completed: true,
      status: AgreementStatus.COMPLETED,
      timelineEventCreated: true,
    });
  });

  it('returns a no-op for pending milestones', async () => {
    const tx = makeTx();
    tx.agreement.findFirst.mockResolvedValue({ id: AGREEMENT_ID, freelancerId: FREELANCER_ID, status: AgreementStatus.ACTIVE });
    tx.milestone.findMany.mockResolvedValue([{ status: 'ACTIVE', paymentStatus: PrismaPaymentStatus.RELEASED }]);

    const result = await service.checkCompletionStatus(tx, AGREEMENT_ID);

    expect(result).toEqual({
      agreementId: AGREEMENT_ID,
      completed: false,
      status: AgreementStatus.ACTIVE,
      timelineEventCreated: false,
    });
  });

  it('returns a no-op for unpaid milestones', async () => {
    const tx = makeTx();
    tx.agreement.findFirst.mockResolvedValue({ id: AGREEMENT_ID, freelancerId: FREELANCER_ID, status: AgreementStatus.ACTIVE });
    tx.milestone.findMany.mockResolvedValue([{ status: 'ACCEPTED', paymentStatus: PrismaPaymentStatus.WAITING }]);

    const result = await service.checkCompletionStatus(tx, AGREEMENT_ID);

    expect(result.completed).toBe(false);
  });

  it('returns a no-op for agreements without milestones', async () => {
    const tx = makeTx();
    tx.agreement.findFirst.mockResolvedValue({ id: AGREEMENT_ID, freelancerId: FREELANCER_ID, status: AgreementStatus.ACTIVE });
    tx.milestone.findMany.mockResolvedValue([]);

    const result = await service.checkCompletionStatus(tx, AGREEMENT_ID);

    expect(result.completed).toBe(false);
  });

  it('returns a no-op for completed agreements', async () => {
    const tx = makeTx();
    tx.agreement.findFirst.mockResolvedValue({ id: AGREEMENT_ID, freelancerId: FREELANCER_ID, status: AgreementStatus.COMPLETED });

    const result = await service.checkCompletionStatus(tx, AGREEMENT_ID);

    expect(result).toEqual({
      agreementId: AGREEMENT_ID,
      completed: false,
      status: AgreementStatus.COMPLETED,
      timelineEventCreated: false,
    });
  });

  it('rejects completion checks for foreign agreements', async () => {
    const tx = makeTx();
    tx.agreement.findFirst.mockResolvedValue(null);

    await expect(service.checkCompletionStatus(tx, AGREEMENT_ID)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_NOT_FOUND,
    });
  });
});
