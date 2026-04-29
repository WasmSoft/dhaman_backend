import {
  AIRecommendation,
  AIReviewStatus,
  TimelineActorRole,
} from '@prisma/client';
import {
  createReviewRecord,
  createService,
} from './ai-review-service-test-helpers';

describe('AiReviewService response contract', () => {
  it('maps the public review fields and excludes rawResponse', () => {
    const { service } = createService();

    const result = (
      service as never as {
        toResponse: (value: unknown) => Record<string, unknown>;
      }
    ).toResponse(
      createReviewRecord({
        status: AIReviewStatus.COMPLETED,
        recommendation: AIRecommendation.PARTIAL,
        matchScore: 72,
        reasoning: 'Mock reasoning',
        completedCriteria: ['Responsive layout'],
        missingCriteria: ['Contact form'],
        outOfScopeItems: ['Login system'],
        requestedByRole: TimelineActorRole.CLIENT,
        rawResponse: { provider: 'mock' },
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'review-1',
        agreementId: 'agreement-1',
        milestoneId: 'milestone-1',
        deliveryId: 'delivery-1',
        status: AIReviewStatus.COMPLETED,
        matchScore: 72,
        recommendation: AIRecommendation.PARTIAL,
        reasoning: 'Mock reasoning',
        completedCriteria: ['Responsive layout'],
        missingCriteria: ['Contact form'],
        outOfScopeItems: ['Login system'],
        requestedByRole: TimelineActorRole.CLIENT,
      }),
    );
    expect(result).not.toHaveProperty('rawResponse');
  });
});
