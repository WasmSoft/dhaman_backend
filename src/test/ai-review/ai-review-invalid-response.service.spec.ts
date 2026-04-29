import { AIRecommendation, AIReviewStatus, TimelineActorRole } from '@prisma/client';
import { Locale } from '../../common/enums/locale.enum';
import {
  createGeminiServiceMock,
  createService,
  mockSuccessfulOpenReview,
  REVIEW_OBJECTION,
} from './ai-review-service-test-helpers';

describe('AiReviewService Gemini invalid response handling', () => {
  it('retries once then falls back to mock when Gemini returns schema-invalid JSON both times', async () => {
    const geminiService = createGeminiServiceMock();

    (geminiService.generateContent as jest.Mock)
      .mockResolvedValueOnce('{ "recommendation": "ACCEPT" }')
      .mockResolvedValueOnce('not json at all');

    const { service, prisma } = createService(Locale.EN, geminiService);
    mockSuccessfulOpenReview(prisma);

    const result = await service.openReview(
      'delivery-1',
      {
        objection: REVIEW_OBJECTION,
        relatedCriteria: ['Contact form'],
      },
      TimelineActorRole.CLIENT,
      'portal-token-1',
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'review-1',
        status: AIReviewStatus.COMPLETED,
        matchScore: 72,
        recommendation: AIRecommendation.PARTIAL,
      }),
    );
    expect(geminiService.generateContent).toHaveBeenCalledTimes(2);
  });
});
