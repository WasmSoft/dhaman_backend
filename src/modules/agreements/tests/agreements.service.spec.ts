import { Test, TestingModule } from '@nestjs/testing';
import {
  AgreementStatus,
  TimelineActorRole,
  TimelineEventType,
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
