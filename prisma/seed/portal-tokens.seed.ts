import { PortalTokenType } from '@prisma/client';
import { createHash } from 'crypto';
import { SeedClient, SeedContext } from './types';

const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

const portalTokens = [
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    agreementKey: 'activePortal',
    token: 'demo-active-invite-token',
    tokenPreview: 'demo...oken',
    type: PortalTokenType.AGREEMENT_INVITE,
    expiresAt: new Date('2026-08-01T00:00:00.000Z'),
    revokedAt: null,
    lastAccessedAt: new Date('2026-05-08T11:05:00.000Z'),
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    agreementKey: 'activePortal',
    token: 'demo-delivery-review-token',
    tokenPreview: 'demo...view',
    type: PortalTokenType.DELIVERY_REVIEW,
    expiresAt: new Date('2026-07-01T00:00:00.000Z'),
    revokedAt: null,
    lastAccessedAt: null,
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    agreementKey: 'disputedClinic',
    token: 'demo-change-request-token',
    tokenPreview: 'demo...uest',
    type: PortalTokenType.CHANGE_REQUEST_REVIEW,
    expiresAt: new Date('2026-06-15T00:00:00.000Z'),
    revokedAt: null,
    lastAccessedAt: new Date('2026-05-20T08:45:00.000Z'),
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
    agreementKey: 'completedBrand',
    token: 'demo-revoked-payment-token',
    tokenPreview: 'demo...ment',
    type: PortalTokenType.PAYMENT_VIEW,
    expiresAt: new Date('2026-05-01T00:00:00.000Z'),
    revokedAt: new Date('2026-04-09T12:00:00.000Z'),
    lastAccessedAt: new Date('2026-04-08T12:00:00.000Z'),
  },
] as const;

export async function seedPortalTokens(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  for (const token of portalTokens) {
    await prisma.portalToken.upsert({
      where: { tokenHash: tokenHash(token.token) },
      update: {
        agreementId: context.agreements[token.agreementKey],
        expiresAt: token.expiresAt,
        lastAccessedAt: token.lastAccessedAt,
        revokedAt: token.revokedAt,
        tokenPreview: token.tokenPreview,
        type: token.type,
      },
      create: {
        id: token.id,
        agreementId: context.agreements[token.agreementKey],
        expiresAt: token.expiresAt,
        lastAccessedAt: token.lastAccessedAt,
        revokedAt: token.revokedAt,
        tokenHash: tokenHash(token.token),
        tokenPreview: token.tokenPreview,
        type: token.type,
      },
    });
  }
}
