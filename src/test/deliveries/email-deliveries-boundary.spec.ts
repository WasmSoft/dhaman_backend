import { NotificationStatus, NotificationType } from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { Locale } from '../../common/enums/locale.enum';
import { ActorType } from '../../common/enums/actor-type.enum';
import { EmailNotificationsService } from '../../modules/email-notifications/email-notifications.service';

const NOW = new Date('2026-04-30T00:00:00.000Z');
const FREELANCER_ID = 'freelancer-1111-1111-1111-111111111111';
const AGREEMENT_ID = 'agreement-3333-3333-3333-333333333333';

function createPrismaMock() {
  return {
    agreement: {
      findFirst: jest.fn().mockResolvedValue({
        id: AGREEMENT_ID,
        title: 'Test',
        description: '',
        serviceType: '',
        totalAmount: { toString: () => '100' },
        currency: 'SAR',
        status: 'DRAFT',
        client: {
          name: 'Client',
          email: 'client@example.com',
          companyName: null,
        },
        freelancer: { name: 'FL', email: 'f@f.com' },
      }),
    },
    emailNotification: {
      create: jest.fn().mockResolvedValue({
        id: 'notif-1',
        agreementId: AGREEMENT_ID,
        recipientEmail: 'client@example.com',
        type: NotificationType.DELIVERY_SUBMITTED,
        subject: '...',
        status: NotificationStatus.SENT,
        providerMessageId: 'demo_123',
        errorMessage: null,
        previewHtml: null,
        sentAt: NOW,
        createdAt: NOW,
      }),
      update: jest.fn().mockResolvedValue({
        id: 'notif-1',
        agreementId: AGREEMENT_ID,
        recipientEmail: 'client@example.com',
        type: NotificationType.DELIVERY_SUBMITTED,
        subject: '...',
        status: NotificationStatus.SENT,
        providerMessageId: 'demo_123',
        errorMessage: null,
        previewHtml: null,
        sentAt: NOW,
        createdAt: NOW,
      }),
    },
    $transaction: jest.fn((ops: unknown[]) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      return (ops as () => unknown)();
    }),
  };
}

describe('Email notifications — delivery boundary', () => {
  it.skip('sendNotification with DELIVERY_SUBMITTED type does not throw (trigger TBD by Deliveries module)', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma as never, cls);

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
          recipientEmail: 'client@example.com',
          type: NotificationType.DELIVERY_SUBMITTED,
        }),
    );

    expect(result.status).toBe(NotificationStatus.SENT);
  });
});
