import { AIRecommendation, AIReviewStatus, TimelineActorRole } from '@prisma/client';
import { Locale } from '../../common/enums/locale.enum';
import {
  createGeminiServiceMock,
  createService,
  mockSuccessfulOpenReview,
  REVIEW_OBJECTION,
} from './ai-review-service-test-helpers';

const GEMINI_RESULT = JSON.stringify({
  matchScore: 85,
  recommendation: 'ACCEPT',
  completedCriteria: [
    'Responsive layout',
    'Brand colors',
    'Portfolio section',
    'Contact form',
    'Performance budget',
  ],
  missingCriteria: [],
  outOfScopeItems: [],
  reasoning: 'All criteria are fully met.',
});

describe('AiReviewService openReview client success', () => {
  it('opens, processes, and returns a completed review for a client actor using Gemini', async () => {
    const geminiService = createGeminiServiceMock();
    (geminiService.generateContent as jest.Mock).mockResolvedValue(GEMINI_RESULT);

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
        matchScore: 85,
        recommendation: AIRecommendation.ACCEPT,
        completedCriteria: [
          'Responsive layout',
          'Brand colors',
          'Portfolio section',
          'Contact form',
          'Performance budget',
        ],
      }),
    );
    expect(prisma.payment.update).toHaveBeenCalled();
    expect(prisma.timelineEvent.create).toHaveBeenCalledTimes(2);
    expect(prisma.emailNotification.create).toHaveBeenCalledTimes(1);

    const completionUpdate = (prisma.aIReview.update as jest.Mock).mock.calls[1][0].data;
    expect(completionUpdate.rawResponse).toEqual({
      provider: 'gemini',
      response: expect.objectContaining({
        matchScore: 85,
        recommendation: 'ACCEPT',
      }),
    });
  });
});
