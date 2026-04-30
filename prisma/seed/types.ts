import { PrismaClient } from '@prisma/client';

export type SeedClient = PrismaClient;

export type SeedContext = {
  users: Record<string, string>;
  clients: Record<string, string>;
  agreements: Record<string, string>;
  milestones: Record<string, string>;
  deliveries: Record<string, string>;
  aiReviews: Record<string, string>;
  changeRequests: Record<string, string>;
};

export const emptySeedContext = (): SeedContext => ({
  users: {},
  clients: {},
  agreements: {},
  milestones: {},
  deliveries: {},
  aiReviews: {},
  changeRequests: {},
});
