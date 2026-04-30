import { NotificationStatus, NotificationType, AgreementStatus } from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { Locale } from '../../common/enums/locale.enum';
import { ActorType } from '../../common/enums/actor-type.enum';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { EmailNotificationsService } from '../../modules/email-notifications/email-notifications.service';

const NOW = new Date('2026-04-30T00:00:00.000Z');
const FREELANCER_ID = 'freelancer-1111-1111-1111-111111111111';
const AGREEMENT_ID = 'agreement-3333-3333-3333-333333333333';

function createPrismaMock() {
  return {
    agreement: {
      findFirst: jest.fn(),
    },
    emailNotification: {
      create: jest.fn(),
      update: jest.fn(),
    },
    timelineEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      return (ops as () => unknown)();
    }),
  };
}

function createMockAgreement(status: AgreementStatus = AgreementStatus.DRAFT) {
  return {
    id: AGREEMENT_ID,
    title: 'Test Agreement',
    description: '',
    serviceType: '',
    totalAmount: { toString: () => '100' },
    currency: 'SAR',
    status,
    client: { name: 'Test Client', email: 'client@example.com', companyName: null },
    freelancer: { name: 'FL', email: 'f@f.com' },
  };
}

function createMockNotification(status: NotificationStatus) {
  return {
    id: 'notif-1',
    agreementId: AGREEMENT_ID,
    recipientEmail: 'client@example.com',
    type: NotificationType.AGREEMENT_INVITE,
    subject: '...',
    status,
    providerMessageId: status === NotificationStatus.SENT ? 'demo_123' : null,
    errorMessage: status === NotificationStatus.FAILED ? 'provider unavailable' : null,
    previewHtml: null,
    sentAt: status === NotificationStatus.SENT ? NOW : null,
    createdAt: NOW,
  };
}

describe('Email notifications — agreement invite boundary', () => {
  it('resendAgreementInvite creates notification and timeline evidence for a DRAFT agreement', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma as never, cls);

    prisma.agreement.findFirst.mockResolvedValue(createMockAgreement(AgreementStatus.DRAFT));
    prisma.emailNotification.create.mockResolvedValue(createMockNotification(NotificationStatus.PENDING));
    prisma.emailNotification.update.mockResolvedValue(createMockNotification(NotificationStatus.SENT));

    const result = await cls.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-1',
        locale: Locale.AR,
        requestId: 'req-1',
        startedAt: NOW,
        userId: FREELANCER_ID,
      },
      () => service.resendAgreementInvite(AGREEMENT_ID, FREELANCER_ID),
    );

    expect(result.status).toBe(NotificationStatus.SENT);
    expect(result.type).toBe(NotificationType.AGREEMENT_INVITE);
    expect(prisma.timelineEvent.create).toHaveBeenCalled();
  });

  it('resendAgreementInvite returns FAILED when provider unavailable but still creates timeline evidence', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma as never, cls);

    prisma.agreement.findFirst.mockResolvedValue(createMockAgreement(AgreementStatus.SENT));
    prisma.emailNotification.create.mockResolvedValue(createMockNotification(NotificationStatus.PENDING));
    prisma.emailNotification.update.mockResolvedValue(createMockNotification(NotificationStatus.FAILED));

    const result = await cls.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-1',
        locale: Locale.AR,
        requestId: 'req-1',
        startedAt: NOW,
        userId: FREELANCER_ID,
      },
      () => service.resendAgreementInvite(AGREEMENT_ID, FREELANCER_ID),
    );

    expect(result.status).toBe(NotificationStatus.FAILED);
    expect(prisma.timelineEvent.create).toHaveBeenCalled();
  });

  it('resendAgreementInvite throws AGREEMENT_NOT_FOUND when agreement does not belong to freelancer', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma as never, cls);

    prisma.agreement.findFirst.mockResolvedValue(null);

    await expect(
      cls.run(
        {
          actorType: ActorType.FREELANCER,
          correlationId: 'corr-1',
          locale: Locale.AR,
          requestId: 'req-1',
          startedAt: NOW,
          userId: FREELANCER_ID,
        },
        () => service.resendAgreementInvite(AGREEMENT_ID, FREELANCER_ID),
      ),
    ).rejects.toMatchObject({ code: ErrorCode.AGREEMENT_NOT_FOUND });
  });

  it('resendAgreementInvite throws AGREEMENT_NOT_FOUND when agreement does not exist', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma as never, cls);

    prisma.agreement.findFirst.mockResolvedValue(null);

    await expect(
      cls.run(
        {
          actorType: ActorType.FREELANCER,
          correlationId: 'corr-1',
          locale: Locale.AR,
          requestId: 'req-1',
          startedAt: NOW,
          userId: FREELANCER_ID,
        },
        () => service.resendAgreementInvite(AGREEMENT_ID, 'other-freelancer'),
      ),
    ).rejects.toMatchObject({ code: ErrorCode.AGREEMENT_NOT_FOUND });
  });
});

describe('Email notifications — sendNotification non-blocking boundary', () => {
  it('sendNotification returns FAILED record instead of throwing when provider is unavailable', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma as never, cls);

    prisma.agreement.findFirst.mockResolvedValue(createMockAgreement());
    prisma.emailNotification.create.mockResolvedValue(createMockNotification(NotificationStatus.PENDING));
    prisma.emailNotification.update.mockResolvedValue(createMockNotification(NotificationStatus.FAILED));

    const result = await cls.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-1',
        locale: Locale.AR,
        requestId: 'req-1',
        startedAt: NOW,
        userId: FREELANCER_ID,
      },
      () =>
        service.sendNotification({
          agreementId: AGREEMENT_ID,
          recipientEmail: 'test@example.com',
          type: NotificationType.AGREEMENT_INVITE,
        }),
    );

    expect(result.status).toBe(NotificationStatus.FAILED);
  });

  it('sendNotification does not throw even when DB operations fail mid-flight', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma as never, cls);

    prisma.agreement.findFirst.mockResolvedValue(createMockAgreement());
    prisma.emailNotification.create
      .mockRejectedValueOnce(new Error('DB transient error'))
      .mockResolvedValueOnce(createMockNotification(NotificationStatus.FAILED));

    const result = await cls.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-1',
        locale: Locale.AR,
        requestId: 'req-1',
        startedAt: NOW,
        userId: FREELANCER_ID,
      },
      () =>
        service.sendNotification({
          agreementId: AGREEMENT_ID,
          recipientEmail: 'test@example.com',
          type: NotificationType.AGREEMENT_INVITE,
        }),
    );

    expect(result.status).toBe(NotificationStatus.FAILED);
  });
});
