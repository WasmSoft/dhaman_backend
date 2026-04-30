import {
  NotificationStatus,
  NotificationType,
  AgreementStatus,
} from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { Locale } from '../../common/enums/locale.enum';
import { ActorType } from '../../common/enums/actor-type.enum';
import { EmailNotificationsService } from '../../modules/email-notifications/email-notifications.service';

const NOW = new Date('2026-04-30T00:00:00.000Z');
const FREELANCER_ID = 'freelancer-1111-1111-1111-111111111111';

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

function createPendingRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notification-1',
    agreementId: 'agreement-1',
    recipientEmail: 'freelancer@example.com',
    type: NotificationType.AI_REVIEW_READY,
    subject: '...',
    status: NotificationStatus.PENDING,
    providerMessageId: null,
    errorMessage: null,
    previewHtml: '<html>...</html>',
    sentAt: null,
    createdAt: NOW,
    ...overrides,
  };
}

function createSentRecord(overrides: Record<string, unknown> = {}) {
  return {
    ...createPendingRecord(overrides),
    status: NotificationStatus.SENT,
    providerMessageId: 'demo_123',
    sentAt: NOW,
  };
}

describe('EmailNotificationsService enqueueAiReviewOpenedForFreelancer', () => {
  it('creates a pending AI review notification record for the freelancer', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma as never, cls);

    prisma.agreement.findFirst.mockResolvedValue({
      id: 'agreement-1',
      title: 'Test',
      description: '',
      serviceType: '',
      totalAmount: { toString: () => '100' },
      currency: 'SAR',
      status: AgreementStatus.DRAFT,
      client: {
        name: 'Client',
        email: 'client@example.com',
        companyName: null,
      },
      freelancer: { name: 'FL', email: 'f@f.com' },
    });
    prisma.emailNotification.create.mockResolvedValue(createPendingRecord());
    prisma.emailNotification.update.mockResolvedValue(createSentRecord());

    await cls.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-1',
        locale: Locale.AR,
        requestId: 'req-1',
        startedAt: NOW,
        userId: FREELANCER_ID,
      },
      () =>
        service.enqueueAiReviewOpenedForFreelancer({
          agreementId: 'agreement-1',
          recipientEmail: 'freelancer@example.com',
          aiReviewId: 'review-1',
          deliveryId: 'delivery-1',
          milestoneId: 'milestone-1',
        }),
    );

    expect(prisma.emailNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agreementId: 'agreement-1',
        recipientEmail: 'freelancer@example.com',
        type: NotificationType.AI_REVIEW_READY,
        status: NotificationStatus.PENDING,
      }),
    });
  });

  it('throws EMAIL_RECIPIENT_REQUIRED when the recipient email is missing', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma as never, cls);

    await expect(
      service.enqueueAiReviewOpenedForFreelancer({
        agreementId: 'agreement-1',
        recipientEmail: '',
        aiReviewId: 'review-1',
        deliveryId: 'delivery-1',
        milestoneId: 'milestone-1',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.EMAIL_RECIPIENT_REQUIRED });
  });
});

describe('EmailNotificationsService enqueueAiReviewRecommendationAcceptedForClient', () => {
  it('creates notification for accepted recommendation', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma as never, cls);

    prisma.agreement.findFirst.mockResolvedValue({
      id: 'agreement-1',
      title: 'Test',
      description: '',
      serviceType: '',
      totalAmount: { toString: () => '100' },
      currency: 'SAR',
      status: AgreementStatus.DRAFT,
      client: {
        name: 'Client',
        email: 'client@example.com',
        companyName: null,
      },
      freelancer: { name: 'FL', email: 'f@f.com' },
    });
    prisma.emailNotification.create.mockResolvedValue(createPendingRecord());
    prisma.emailNotification.update.mockResolvedValue(createSentRecord());

    await cls.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-1',
        locale: Locale.AR,
        requestId: 'req-1',
        startedAt: NOW,
        userId: FREELANCER_ID,
      },
      () =>
        service.enqueueAiReviewRecommendationAcceptedForClient({
          agreementId: 'agreement-1',
          recipientEmail: 'client@example.com',
          recommendation: 'RELEASE_TO_FREELANCER',
          paymentStatus: 'READY_TO_RELEASE',
        }),
    );

    expect(prisma.emailNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: NotificationType.AI_REVIEW_RECOMMENDATION_ACCEPTED,
        status: NotificationStatus.PENDING,
      }),
    });
  });

  it('throws EMAIL_RECIPIENT_REQUIRED when the recipient email is missing', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma as never, cls);

    await expect(
      service.enqueueAiReviewRecommendationAcceptedForClient({
        agreementId: 'agreement-1',
        recipientEmail: '',
        recommendation: 'RELEASE_TO_FREELANCER',
        paymentStatus: 'READY_TO_RELEASE',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.EMAIL_RECIPIENT_REQUIRED });
  });
});
