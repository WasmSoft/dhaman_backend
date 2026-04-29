import { NotificationStatus, NotificationType } from '@prisma/client';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { EmailNotificationsService } from '../../modules/email-notifications/email-notifications.service';

function createPrismaMock() {
  return {
    emailNotification: {
      create: jest.fn(),
    },
  };
}

describe('EmailNotificationsService enqueueAiReviewOpenedForFreelancer', () => {
  it('creates a pending AI review notification record for the freelancer', async () => {
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma as never);

    prisma.emailNotification.create.mockResolvedValue({ id: 'notification-1' });

    await service.enqueueAiReviewOpenedForFreelancer({
      agreementId: 'agreement-1',
      recipientEmail: 'freelancer@example.com',
      aiReviewId: 'review-1',
      deliveryId: 'delivery-1',
      milestoneId: 'milestone-1',
    });

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
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma as never);

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
