import {
  AIRecommendation,
  AIReviewStatus,
  TimelineActorRole,
} from '@prisma/client';
import { SeedClient, SeedContext } from './types';

const aiReviews = [
  {
    id: '88888888-8888-4888-8888-888888888881',
    key: 'clinicDisputeReview',
    agreementKey: 'disputedClinic',
    milestoneKey: 'clinicFrontend',
    deliveryKey: 'clinicDelivery',
    requestedByRole: TimelineActorRole.CLIENT,
    objection: 'Arabic mobile booking flow differs from the agreed wireframes.',
    status: AIReviewStatus.COMPLETED,
    matchScore: 0.72,
    recommendation: AIRecommendation.PARTIAL,
    reasoning:
      'Core booking functionality is present, but two Arabic mobile screens need correction.',
  },
  {
    id: '88888888-8888-4888-8888-888888888882',
    key: 'portalBuildReview',
    agreementKey: 'activePortal',
    milestoneKey: 'portalBuild',
    deliveryKey: 'portalBuildDelivery',
    requestedByRole: TimelineActorRole.SYSTEM,
    objection: 'Automated review requested before payment release.',
    status: AIReviewStatus.PROCESSING,
    matchScore: null,
    recommendation: AIRecommendation.NEEDS_HUMAN_REVIEW,
    reasoning: null,
  },
  {
    id: '88888888-8888-4888-8888-888888888883',
    key: 'brandAcceptanceReview',
    agreementKey: 'completedBrand',
    milestoneKey: 'brandKit',
    deliveryKey: 'brandDelivery',
    requestedByRole: TimelineActorRole.CLIENT,
    objection: 'Confirm final package completeness.',
    status: AIReviewStatus.COMPLETED,
    matchScore: 0.96,
    recommendation: AIRecommendation.ACCEPT,
    reasoning:
      'All listed launch-kit deliverables were included in final files.',
  },
] as const;

export async function seedAIReviews(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  for (const review of aiReviews) {
    const created = await prisma.aIReview.upsert({
      where: { id: review.id },
      update: {
        agreementId: context.agreements[review.agreementKey],
        completedCriteria: review.matchScore
          ? ['Core scope delivered']
          : undefined,
        deliveryId: context.deliveries[review.deliveryKey],
        matchScore: review.matchScore,
        milestoneId: context.milestones[review.milestoneKey],
        missingCriteria:
          review.recommendation === AIRecommendation.PARTIAL
            ? ['Arabic mobile booking confirmation screen']
            : [],
        objection: review.objection,
        outOfScopeItems: [],
        rawResponse: {
          seeded: true,
          source: 'prisma seed',
        },
        reasoning: review.reasoning,
        recommendation: review.recommendation,
        relatedCriteria: ['Responsive flow', 'Acceptance criteria alignment'],
        requestedByRole: review.requestedByRole,
        status: review.status,
      },
      create: {
        id: review.id,
        agreementId: context.agreements[review.agreementKey],
        completedCriteria: review.matchScore ? ['Core scope delivered'] : [],
        deliveryId: context.deliveries[review.deliveryKey],
        matchScore: review.matchScore,
        milestoneId: context.milestones[review.milestoneKey],
        missingCriteria:
          review.recommendation === AIRecommendation.PARTIAL
            ? ['Arabic mobile booking confirmation screen']
            : [],
        objection: review.objection,
        outOfScopeItems: [],
        rawResponse: {
          seeded: true,
          source: 'prisma seed',
        },
        reasoning: review.reasoning,
        recommendation: review.recommendation,
        relatedCriteria: ['Responsive flow', 'Acceptance criteria alignment'],
        requestedByRole: review.requestedByRole,
        status: review.status,
      },
    });

    context.aiReviews[review.key] = created.id;
  }
}
