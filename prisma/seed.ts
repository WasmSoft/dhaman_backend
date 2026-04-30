import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seed/index';
import { demoCredentials } from './seed/users.seed';

const prisma = new PrismaClient();

async function main() {
  await seedDatabase(prisma);

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.agreement.count(),
    prisma.milestone.count(),
    prisma.payment.count(),
    prisma.delivery.count(),
    prisma.aIReview.count(),
    prisma.changeRequest.count(),
    prisma.emailNotification.count(),
    prisma.timelineEvent.count(),
    prisma.auditLog.count(),
    prisma.aiPlanDraft.count(),
    prisma.portalToken.count(),
    prisma.userSettings.count(),
    prisma.agreementPolicy.count(),
  ]);

  console.log('Seed completed successfully.');
  console.log(
    `Demo login: ${demoCredentials.email} / ${demoCredentials.password}`,
  );
  console.log(
    [
      'Counts:',
      `users=${counts[0]}`,
      `clients=${counts[1]}`,
      `agreements=${counts[2]}`,
      `milestones=${counts[3]}`,
      `payments=${counts[4]}`,
      `deliveries=${counts[5]}`,
      `aiReviews=${counts[6]}`,
      `changeRequests=${counts[7]}`,
      `emailNotifications=${counts[8]}`,
      `timelineEvents=${counts[9]}`,
      `auditLogs=${counts[10]}`,
      `aiPlanDrafts=${counts[11]}`,
      `portalTokens=${counts[12]}`,
      `userSettings=${counts[13]}`,
      `agreementPolicies=${counts[14]}`,
    ].join(' '),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
