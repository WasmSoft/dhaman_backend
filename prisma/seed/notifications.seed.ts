import { NotificationStatus, NotificationType } from '@prisma/client';
import { SeedClient, SeedContext } from './types';

const notifications = [
  {
    id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    agreementKey: 'activePortal',
    recipientEmail: 'layla@riyadhretail.example',
    recipientName: 'Layla Al-Qahtani',
    type: NotificationType.AGREEMENT_APPROVED,
    subject: 'Agreement approved: Retail Analytics Portal MVP',
    status: NotificationStatus.SENT,
    sentAt: new Date('2026-05-08T11:10:00.000Z'),
    errorMessage: null,
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    agreementKey: 'activePortal',
    recipientEmail: 'layla@riyadhretail.example',
    recipientName: 'Layla Al-Qahtani',
    type: NotificationType.DELIVERY_SUBMITTED,
    subject: 'Delivery submitted for review',
    status: NotificationStatus.PENDING,
    sentAt: null,
    errorMessage: null,
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    agreementKey: 'disputedClinic',
    recipientEmail: 'maha@healthclinic.example',
    recipientName: 'Maha Hassan',
    type: NotificationType.AI_REVIEW_READY,
    subject: 'AI review is ready for your disputed delivery',
    status: NotificationStatus.FAILED,
    sentAt: null,
    errorMessage: 'Demo provider timeout',
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc4',
    agreementKey: null,
    recipientEmail: 'demo@demo.com',
    recipientName: 'Demo Admin',
    type: NotificationType.SYSTEM_TEST,
    subject: 'Dhaman demo notification test',
    status: NotificationStatus.SENT,
    sentAt: new Date('2026-05-01T08:00:00.000Z'),
    errorMessage: null,
  },
] as const;

export async function seedEmailNotifications(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  for (const notification of notifications) {
    await prisma.emailNotification.upsert({
      where: { id: notification.id },
      update: {
        agreementId: notification.agreementKey
          ? context.agreements[notification.agreementKey]
          : null,
        correlationId: `corr-${notification.id.slice(0, 8)}`,
        errorMessage: notification.errorMessage,
        metadata: { seeded: true },
        previewHtml: `<p>${notification.subject}</p>`,
        previewText: notification.subject,
        providerMessageId:
          notification.status === NotificationStatus.SENT
            ? `provider-${notification.id.slice(0, 8)}`
            : null,
        recipientEmail: notification.recipientEmail,
        recipientName: notification.recipientName,
        requestId: `req-${notification.id.slice(0, 8)}`,
        sentAt: notification.sentAt,
        status: notification.status,
        subject: notification.subject,
        type: notification.type,
      },
      create: {
        id: notification.id,
        agreementId: notification.agreementKey
          ? context.agreements[notification.agreementKey]
          : null,
        correlationId: `corr-${notification.id.slice(0, 8)}`,
        errorMessage: notification.errorMessage,
        metadata: { seeded: true },
        previewHtml: `<p>${notification.subject}</p>`,
        previewText: notification.subject,
        providerMessageId:
          notification.status === NotificationStatus.SENT
            ? `provider-${notification.id.slice(0, 8)}`
            : null,
        recipientEmail: notification.recipientEmail,
        recipientName: notification.recipientName,
        requestId: `req-${notification.id.slice(0, 8)}`,
        sentAt: notification.sentAt,
        status: notification.status,
        subject: notification.subject,
        type: notification.type,
      },
    });
  }
}
