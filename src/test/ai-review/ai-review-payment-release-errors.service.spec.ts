import { ErrorCode } from '../../common/enums/error-code.enum';
import {
  createService,
  REVIEW_PAYMENT_DTO,
} from './ai-review-service-test-helpers';

describe('AiReviewService reviewPaymentRelease errors', () => {
  it('throws UNAUTHORIZED when the agreement is not owned by the freelancer', async () => {
    const { service, prisma } = createService();
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.reviewPaymentRelease(REVIEW_PAYMENT_DTO, 'freelancer-1'),
    ).rejects.toMatchObject({ code: ErrorCode.UNAUTHORIZED });
  });

  it('throws DELIVERY_NOT_FOUND when the delivery does not match the agreement and milestone', async () => {
    const { service, prisma } = createService();
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue({ id: 'agreement-1' });
    (prisma.delivery.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.reviewPaymentRelease(REVIEW_PAYMENT_DTO, 'freelancer-1'),
    ).rejects.toMatchObject({ code: ErrorCode.DELIVERY_NOT_FOUND });
  });
});
