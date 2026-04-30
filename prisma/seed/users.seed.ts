import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SeedClient, SeedContext } from './types';

export const demoCredentials = {
  email: 'demo@demo.com',
  password: 'temporary123',
};

const demoUsers = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    key: 'demoAdmin',
    email: demoCredentials.email,
    name: 'Demo Admin',
    role: UserRole.ADMIN,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
  },
  {
    id: '11111111-1111-4111-8111-111111111112',
    key: 'freelancer',
    email: 'noura.freelance@example.com',
    name: 'Noura Al-Harbi',
    role: UserRole.FREELANCER,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
  },
  {
    id: '11111111-1111-4111-8111-111111111113',
    key: 'adminOps',
    email: 'ops.admin@example.com',
    name: 'Omar Operations',
    role: UserRole.ADMIN,
    avatarUrl: null,
  },
  {
    id: '11111111-1111-4111-8111-111111111114',
    key: 'freelancerNoPassword',
    email: 'invited.freelancer@example.com',
    name: 'Invited Freelancer',
    role: UserRole.FREELANCER,
    avatarUrl: null,
  },
] as const;

export async function seedUsers(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  const passwordHash = await bcrypt.hash(demoCredentials.password, 12);
  const altPasswordHash = await bcrypt.hash('temporary456', 12);

  for (const user of demoUsers) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        avatarUrl: user.avatarUrl,
        name: user.name,
        passwordHash:
          user.key === 'freelancerNoPassword'
            ? null
            : user.key === 'demoAdmin'
              ? passwordHash
              : altPasswordHash,
        role: user.role,
      },
      create: {
        id: user.id,
        avatarUrl: user.avatarUrl,
        email: user.email,
        name: user.name,
        passwordHash:
          user.key === 'freelancerNoPassword'
            ? null
            : user.key === 'demoAdmin'
              ? passwordHash
              : altPasswordHash,
        role: user.role,
      },
    });

    context.users[user.key] = created.id;
  }
}
