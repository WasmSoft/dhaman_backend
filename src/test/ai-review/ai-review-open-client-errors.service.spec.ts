import { AIReviewStatus, PaymentStatus, TimelineActorRole } from '@prisma/client';
import { ErrorCode } from '../../common/enums/error-code.enum';
import {
  createDeliveryFixture,
  createService,
  REVIEW_OBJECTION,
} from './ai-review-service-test-helpers';

describe('AiReviewService openReview client errors', () => {
  it('throws DELIVERY_NOT_FOUND when the delivery does not exist', async () => {
    const { service, prisma } = createService();
    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.openReview(
        'missing-delivery',
        { objection: REVIEW_OBJECTION },
        TimelineActorRole.CLIENT,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.DELIVERY_NOT_FOUND });
  });

  it('throws PAYMENT_NOT_FOUND when the milestone payment does not exist', async () => {
    const { service, prisma } = createService();
    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(
      createDeliveryFixture(),
    );
    (prisma.aIReview.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.openReview(
        'delivery-1',
        { objection: REVIEW_OBJECTION },
        TimelineActorRole.CLIENT,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
  });

  it('throws PAYMENT_NOT_READY_TO_RELEASE when the payment is not reviewable', async () => {
    const { service, prisma } = createService();
    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(
      createDeliveryFixture(),
    );
    (prisma.aIReview.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.RELEASED,
    });

    await expect(
      service.openReview(
        'delivery-1',
        { objection: REVIEW_OBJECTION },
        TimelineActorRole.CLIENT,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE });
  });

  it('throws AI_REVIEW_ALREADY_COMPLETED when a blocking review already exists', async () => {
    const { service, prisma } = createService();
    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(
      createDeliveryFixture(),
    );
    (prisma.aIReview.findFirst as jest.Mock).mockResolvedValue({
      id: 'review-existing',
      status: AIReviewStatus.PROCESSING,
    });

    await expect(
      service.openReview(
        'delivery-1',
        { objection: REVIEW_OBJECTION },
        TimelineActorRole.CLIENT,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.AI_REVIEW_ALREADY_COMPLETED });
  });
});
