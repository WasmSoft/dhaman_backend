import { SeedClient, SeedContext } from './types';

const clients = [
  {
    id: '33333333-3333-4333-8333-333333333331',
    key: 'riyadhRetail',
    freelancerKey: 'demoAdmin',
    name: 'Layla Al-Qahtani',
    email: 'layla@riyadhretail.example',
    phone: '+966501112233',
    companyName: 'Riyadh Retail Co.',
  },
  {
    id: '33333333-3333-4333-8333-333333333332',
    key: 'gulfLogistics',
    freelancerKey: 'demoAdmin',
    name: 'Fahad Al-Mutairi',
    email: 'fahad@gulflogistics.example',
    phone: '+966552224444',
    companyName: 'Gulf Logistics Hub',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    key: 'healthClinic',
    freelancerKey: 'demoAdmin',
    name: 'Maha Hassan',
    email: 'maha@healthclinic.example',
    phone: null,
    companyName: 'North Care Clinic',
  },
  {
    id: '33333333-3333-4333-8333-333333333334',
    key: 'nouraClient',
    freelancerKey: 'freelancer',
    name: 'Yousef Khaled',
    email: 'yousef@launchcafe.example',
    phone: '+966566667777',
    companyName: 'Launch Cafe',
  },
] as const;

export async function seedClients(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  for (const client of clients) {
    const freelancerId = context.users[client.freelancerKey];
    const created = await prisma.client.upsert({
      where: {
        freelancerId_email: {
          email: client.email,
          freelancerId,
        },
      },
      update: {
        companyName: client.companyName,
        name: client.name,
        phone: client.phone,
      },
      create: {
        id: client.id,
        companyName: client.companyName,
        email: client.email,
        freelancerId,
        name: client.name,
        phone: client.phone,
      },
    });

    context.clients[client.key] = created.id;
  }
}
