import { SeedClient, SeedContext } from './types';

export async function seedSettings(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  const settings = [
    {
      id: '22222222-2222-4222-8222-222222222221',
      userId: context.users.demoAdmin,
      defaultCurrency: 'SAR',
      defaultServiceType: 'Web application development',
      defaultDelayPolicy:
        'Delays beyond 5 business days require written notice.',
      defaultCancellationPolicy:
        'Approved completed work remains payable if the client cancels.',
      defaultExtraRequestPolicy:
        'Out-of-scope work requires a funded change request.',
      defaultReviewPolicy:
        'Client has 7 days to review each delivery before escalation.',
      aiStrictness: 'balanced',
      emailNotificationsEnabled: true,
      businessName: 'Dhaman Demo Studio',
      bio: 'Demo account for testing freelancer payment protection flows.',
      specialization: 'Product design, SaaS builds, and automation',
      preferredCurrency: 'SAR',
      locale: 'ar',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      userId: context.users.freelancer,
      defaultCurrency: 'USD',
      defaultServiceType: 'Brand identity and landing pages',
      defaultDelayPolicy: 'Milestone dates move only after written approval.',
      defaultCancellationPolicy: 'Deposits are refundable until work begins.',
      defaultExtraRequestPolicy: 'Extra rounds are quoted separately.',
      defaultReviewPolicy: 'Two revision rounds are included per milestone.',
      aiStrictness: 'strict',
      emailNotificationsEnabled: false,
      businessName: 'Noura Creative Lab',
      bio: 'Freelance designer focused on launch-ready brand systems.',
      specialization: 'Brand identity',
      preferredCurrency: 'USD',
      locale: 'en',
    },
  ];

  for (const item of settings) {
    await prisma.userSettings.upsert({
      where: { userId: item.userId },
      select: { id: true },
      update: item,
      create: item,
    });
  }
}
