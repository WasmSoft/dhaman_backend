import { TimelineActorRole, TimelineEventType } from '@prisma/client';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';

function createPrismaMock() {
  return {
    timelineEvent: {
      create: jest.fn(),
    },
  };
}

describe('TimelineEventsService AI review event boundaries', () => {
  it('records AI_REVIEW_REQUESTED with actor metadata', async () => {
    const prisma = createPrismaMock();
    const service = new TimelineEventsService(prisma as never);

    prisma.timelineEvent.create.mockResolvedValue({ id: 'event-1' });

    await service.recordAiReviewRequested({
      agreementId: 'agreement-1',
      milestoneId: 'milestone-1',
      deliveryId: 'delivery-1',
      paymentId: 'payment-1',
      aiReviewId: 'review-1',
      actorRole: TimelineActorRole.CLIENT,
      actorId: 'portal-token-1',
      relatedCriteria: ['responsive layout'],
      milestoneTitle: 'Homepage milestone',
    });

    expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agreementId: 'agreement-1',
        milestoneId: 'milestone-1',
        actorRole: TimelineActorRole.CLIENT,
        actorId: 'portal-token-1',
        type: TimelineEventType.AI_REVIEW_REQUESTED,
        metadata: expect.objectContaining({
          aiReviewId: 'review-1',
          deliveryId: 'delivery-1',
          paymentId: 'payment-1',
          relatedCriteria: ['responsive layout'],
        }),
      }),
    });
  });

  it('records AI_REVIEW_COMPLETED with AI actor and result summary', async () => {
    const prisma = createPrismaMock();
    const service = new TimelineEventsService(prisma as never);

    prisma.timelineEvent.create.mockResolvedValue({ id: 'event-2' });

    await service.recordAiReviewCompleted({
      agreementId: 'agreement-1',
      milestoneId: 'milestone-1',
      deliveryId: 'delivery-1',
      paymentId: 'payment-1',
      aiReviewId: 'review-1',
      matchScore: 72,
      recommendation: 'PARTIAL',
    });

    expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agreementId: 'agreement-1',
        milestoneId: 'milestone-1',
        actorRole: TimelineActorRole.AI,
        type: TimelineEventType.AI_REVIEW_COMPLETED,
        metadata: expect.objectContaining({
          aiReviewId: 'review-1',
          matchScore: 72,
          recommendation: 'PARTIAL',
        }),
      }),
    });
  });
});
