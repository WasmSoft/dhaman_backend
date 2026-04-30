import { Prisma, TimelineActorRole } from '@prisma/client';
import { SeedClient, SeedContext } from './types';

export async function seedAiPlanDrafts(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  const drafts = [
    {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
      userId: context.users.demoAdmin,
      input: {
        currency: 'SAR',
        projectDescription: 'Build a client analytics portal',
        targetBudget: 42000,
      },
      output: {
        milestones: ['Discovery', 'Build', 'Launch'],
        riskScore: 24,
      },
      rawResponse: { provider: 'seeded-demo', confidence: 0.88 },
    },
    {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
      userId: null,
      input: {
        currency: 'USD',
        projectDescription: 'Brand kit for a cafe launch',
        targetBudget: 9500,
      },
      output: {
        milestones: ['Identity', 'Templates', 'Launch assets'],
        riskScore: 12,
      },
      rawResponse: Prisma.JsonNull,
    },
  ];

  for (const draft of drafts) {
    await prisma.aiPlanDraft.upsert({
      where: { id: draft.id },
      update: draft,
      create: draft,
    });
  }
}

export async function seedAuditLogs(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  const logs = [
    {
      id: 'ffffffff-ffff-4fff-8fff-fffffffffff1',
      actorId: context.users.demoAdmin,
      actorRole: TimelineActorRole.FREELANCER,
      action: 'agreement.create',
      entityType: 'Agreement',
      entityId: context.agreements.activePortal,
      metadata: { seeded: true, status: 'ACTIVE' },
    },
    {
      id: 'ffffffff-ffff-4fff-8fff-fffffffffff2',
      actorId: context.users.demoAdmin,
      actorRole: TimelineActorRole.FREELANCER,
      action: 'delivery.submit',
      entityType: 'Delivery',
      entityId: context.deliveries.portalBuildDelivery,
      metadata: { seeded: true, deliveryStatus: 'SUBMITTED' },
    },
    {
      id: 'ffffffff-ffff-4fff-8fff-fffffffffff3',
      actorId: null,
      actorRole: TimelineActorRole.SYSTEM,
      action: 'ai-review.complete',
      entityType: 'AIReview',
      entityId: context.aiReviews.clinicDisputeReview,
      metadata: { recommendation: 'PARTIAL', seeded: true },
    },
    {
      id: 'ffffffff-ffff-4fff-8fff-fffffffffff4',
      actorId: context.users.freelancer,
      actorRole: TimelineActorRole.FREELANCER,
      action: 'payment.release',
      entityType: 'Payment',
      entityId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
      metadata: { amount: '9500.00', currency: 'USD', seeded: true },
    },
  ];

  for (const log of logs) {
    await prisma.auditLog.upsert({
      where: { id: log.id },
      update: log,
      create: log,
    });
  }
}
