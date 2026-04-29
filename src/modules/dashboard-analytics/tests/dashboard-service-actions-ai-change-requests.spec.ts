import {
  AIRecommendation,
  AIReviewStatus,
  Prisma,
  TimelineActorRole,
} from '@prisma/client';
import {
  buildMixedStatusesScenario,
  createDashboardService,
} from './dashboard-service-test-helpers';

describe('dashboard actions for ai reviews and change requests', () => {
  it('returns only actionable ai review and change request items', async () => {
    const { service, prisma } = createDashboardService();

    (prisma.payment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.delivery.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.aIReview.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'review-1',
        status: AIReviewStatus.COMPLETED,
        recommendation: AIRecommendation.NEEDS_HUMAN_REVIEW,
        createdAt: new Date('2026-04-29T09:00:00.000Z'),
        agreement: { id: 'agreement-1', title: 'Landing page redesign' },
      },
    ]);
    (prisma.changeRequest.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'change-1',
        status: 'PENDING',
        amount: new Prisma.Decimal('300.00'),
        currency: 'USD',
        createdAt: new Date('2026-04-29T08:00:00.000Z'),
        agreement: { id: 'agreement-2', title: 'Client portal refresh' },
        requestedByRole: TimelineActorRole.CLIENT,
      },
    ]);

    const result = await service.getActionsRequired({ type: 'all', limit: 10 });

    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'ai_review:review-1',
        type: 'ai_reviews',
        sourceStatus: 'NEEDS_HUMAN_REVIEW',
      }),
      expect.objectContaining({
        id: 'change_request:change-1',
        type: 'change_requests',
        amount: '300.00',
      }),
    ]);
  });

  it('asserts AI-reviews-needing-attention and change-requests-pending classifications against the mixed-statuses fixture (FR-004)', async () => {
    const { service, prisma } = createDashboardService();
    const fixture = buildMixedStatusesScenario();

    const actionableAiReviews = fixture.aiReviews.filter(
      (r) =>
        r.status === 'COMPLETED' &&
        (r.recommendation === 'REJECT' ||
          r.recommendation === 'PARTIAL' ||
          r.recommendation === 'NEEDS_HUMAN_REVIEW'),
    );
    const pendingChangeRequests = fixture.changeRequests.filter(
      (c) =>
        c.status === 'PENDING' &&
        c.requestedByRole === TimelineActorRole.CLIENT,
    );

    (prisma.payment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.delivery.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.aIReview.findMany as jest.Mock).mockResolvedValue(
      actionableAiReviews.map((r) => ({
        id: r.id,
        status: r.status,
        recommendation: r.recommendation,
        createdAt: r.createdAt,
        agreement: { id: r.agreementId, title: 'Test Agreement' },
      })),
    );
    (prisma.changeRequest.findMany as jest.Mock).mockResolvedValue(
      pendingChangeRequests.map((c) => ({
        id: c.id,
        status: c.status,
        amount: c.amount,
        currency: c.currency,
        createdAt: c.createdAt,
        agreement: { id: c.agreementId, title: 'Test Agreement' },
        requestedByRole: c.requestedByRole,
      })),
    );

    const result = await service.getActionsRequired({ type: 'all', limit: 50 });

    const aiItems = result.items.filter((i) => i.type === 'ai_reviews');
    const crItems = result.items.filter((i) => i.type === 'change_requests');

    expect(aiItems.length).toBe(actionableAiReviews.length);
    expect(crItems.length).toBe(pendingChangeRequests.length);

    for (const item of aiItems) {
      expect(['REJECT', 'PARTIAL', 'NEEDS_HUMAN_REVIEW']).toContain(
        item.sourceStatus,
      );
    }
    for (const item of crItems) {
      expect(item.sourceStatus).toBe('PENDING');
    }
  });
});
