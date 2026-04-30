import {
  AIRecommendation,
  AIReviewStatus,
  TimelineActorRole,
} from '@prisma/client';
import { AiReviewResponseDto } from '../../modules/ai-review/dto';
import {
  createService,
  REVIEW_OBJECTION,
  REVIEW_PAYMENT_DTO,
} from './ai-review-service-test-helpers';

describe('AiReviewService reviewPaymentRelease success', () => {
  it('checks ownership and delegates to openReview with freelancer actor context', async () => {
    const { service, prisma } = createService();
    const response: AiReviewResponseDto = {
      id: 'review-1',
      agreementId: 'agreement-1',
      milestoneId: 'milestone-1',
      deliveryId: 'delivery-1',
      status: AIReviewStatus.COMPLETED,
      matchScore: 72,
      recommendation: AIRecommendation.PARTIAL,
      reasoning: 'Mock reasoning',
      completedCriteria: [],
      missingCriteria: [],
      outOfScopeItems: [],
      objection: REVIEW_OBJECTION,
      requestedByRole: TimelineActorRole.FREELANCER,
      createdAt: new Date('2026-04-29T12:00:00.000Z'),
      updatedAt: new Date('2026-04-29T12:00:00.000Z'),
    };

    const openReview = jest
      .spyOn(service, 'openReview')
      .mockResolvedValue(response);

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue({
      id: 'agreement-1',
    });
    (prisma.delivery.findFirst as jest.Mock).mockResolvedValue({
      id: 'delivery-1',
    });

    await expect(
      service.reviewPaymentRelease(REVIEW_PAYMENT_DTO, 'freelancer-1'),
    ).resolves.toBe(response);

    expect(openReview).toHaveBeenCalledWith(
      'delivery-1',
      {
        objection: REVIEW_OBJECTION,
        relatedCriteria: ['Contact form'],
      },
      TimelineActorRole.FREELANCER,
      'freelancer-1',
    );
  });
});
