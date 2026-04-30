import { SeedClient, emptySeedContext } from './types';
import { seedAgreements, seedAgreementPolicies } from './agreements.seed';
import { seedAIReviews } from './ai-reviews.seed';
import { seedAiPlanDrafts, seedAuditLogs } from './audit-ai-plan.seed';
import { seedChangeRequests } from './change-requests.seed';
import { seedClients } from './clients.seed';
import { seedDeliveries } from './deliveries.seed';
import { seedEmailNotifications } from './notifications.seed';
import { seedMilestones } from './milestones.seed';
import { seedPayments } from './payments.seed';
import { seedPortalTokens } from './portal-tokens.seed';
import { seedSettings } from './settings.seed';
import { seedTimelineEvents } from './timeline-events.seed';
import { seedUsers } from './users.seed';

export async function seedDatabase(prisma: SeedClient): Promise<void> {
  const context = emptySeedContext();

  await seedUsers(prisma, context);
  await seedSettings(prisma, context);
  await seedClients(prisma, context);
  await seedAiPlanDrafts(prisma, context);
  await seedAgreements(prisma, context);
  await seedAgreementPolicies(prisma, context);
  await seedMilestones(prisma, context);
  await seedDeliveries(prisma, context);
  await seedAIReviews(prisma, context);
  await seedChangeRequests(prisma, context);
  await seedPayments(prisma, context);
  await seedPortalTokens(prisma, context);
  await seedEmailNotifications(prisma, context);
  await seedTimelineEvents(prisma, context);
  await seedAuditLogs(prisma, context);
}
