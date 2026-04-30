import {
  ChangeRequestStatus,
  PaymentStatus,
  TimelineActorRole,
} from '@prisma/client';
import { SeedClient, SeedContext } from './types';

const changeRequests = [
  {
    id: '99999999-9999-4999-8999-999999999991',
    key: 'clinicArabicFix',
    agreementKey: 'disputedClinic',
    milestoneKey: 'clinicFrontend',
    aiReviewKey: 'clinicDisputeReview',
    requestedByRole: TimelineActorRole.CLIENT,
    title: 'Correct Arabic mobile booking flow',
    amount: '1800.00',
    status: ChangeRequestStatus.FUNDED,
    paymentStatus: PaymentStatus.RESERVED,
    approvedAt: new Date('2026-05-20T09:00:00.000Z'),
    declinedAt: null,
    fundedAt: new Date('2026-05-20T10:30:00.000Z'),
  },
  {
    id: '99999999-9999-4999-8999-999999999992',
    key: 'portalExport',
    agreementKey: 'activePortal',
    milestoneKey: 'portalBuild',
    aiReviewKey: null,
    requestedByRole: TimelineActorRole.CLIENT,
    title: 'Add Excel export for regional dashboard',
    amount: '3200.00',
    status: ChangeRequestStatus.SENT,
    paymentStatus: PaymentStatus.WAITING,
    approvedAt: null,
    declinedAt: null,
    fundedAt: null,
  },
  {
    id: '99999999-9999-4999-8999-999999999993',
    key: 'brandExtraRound',
    agreementKey: 'completedBrand',
    milestoneKey: 'brandKit',
    aiReviewKey: null,
    requestedByRole: TimelineActorRole.CLIENT,
    title: 'Additional menu layout concepts',
    amount: '750.00',
    status: ChangeRequestStatus.DECLINED,
    paymentStatus: PaymentStatus.NOT_REQUIRED,
    approvedAt: null,
    declinedAt: new Date('2026-04-09T11:00:00.000Z'),
    fundedAt: null,
  },
] as const;

export async function seedChangeRequests(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  for (const request of changeRequests) {
    const created = await prisma.changeRequest.upsert({
      where: { id: request.id },
      update: {
        acceptanceCriteria: [
          'Change scope is clearly delivered.',
          'Client can verify the updated screens or files.',
        ],
        additionalTimelineText: 'Adds 3 business days after funding.',
        agreementId: context.agreements[request.agreementKey],
        aiReviewId: request.aiReviewKey
          ? context.aiReviews[request.aiReviewKey]
          : null,
        amount: request.amount,
        approvedAt: request.approvedAt,
        currency: request.agreementKey === 'completedBrand' ? 'USD' : 'SAR',
        declinedAt: request.declinedAt,
        description: `${request.title} requested after milestone review.`,
        fundedAt: request.fundedAt,
        metadata: { seeded: true, source: 'demo seed' },
        milestoneId: context.milestones[request.milestoneKey],
        paymentStatus: request.paymentStatus,
        requestedByRole: request.requestedByRole,
        status: request.status,
        timelineDays: 3,
        title: request.title,
      },
      create: {
        id: request.id,
        acceptanceCriteria: [
          'Change scope is clearly delivered.',
          'Client can verify the updated screens or files.',
        ],
        additionalTimelineText: 'Adds 3 business days after funding.',
        agreementId: context.agreements[request.agreementKey],
        aiReviewId: request.aiReviewKey
          ? context.aiReviews[request.aiReviewKey]
          : null,
        amount: request.amount,
        approvedAt: request.approvedAt,
        currency: request.agreementKey === 'completedBrand' ? 'USD' : 'SAR',
        declinedAt: request.declinedAt,
        description: `${request.title} requested after milestone review.`,
        fundedAt: request.fundedAt,
        metadata: { seeded: true, source: 'demo seed' },
        milestoneId: context.milestones[request.milestoneKey],
        paymentStatus: request.paymentStatus,
        requestedByRole: request.requestedByRole,
        status: request.status,
        timelineDays: 3,
        title: request.title,
      },
    });

    context.changeRequests[request.key] = created.id;
  }
}
