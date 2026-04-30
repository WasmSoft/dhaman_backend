import {
  AgreementStatus,
  TimelineActorRole,
  TimelineEventType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export function makeMockAgreement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'agreement-1',
    freelancerId: 'freelancer-1',
    clientId: 'client-1',
    title: 'Brand Identity Design',
    description: 'Full brand identity package',
    serviceType: 'Graphic Design',
    totalAmount: new Decimal('5000.00'),
    currency: 'SAR',
    status: 'SENT' as AgreementStatus,
    approvedAt: null,
    sentAt: new Date('2026-01-01'),
    expectedDeliveryDate: new Date('2026-03-01'),
    freelancer: { name: 'Ahmed Hassan', email: 'ahmed@example.com' },
    client: { name: 'Sara Al-Rashid', email: 'sara@example.com' },
    policy: null,
    milestones: [],
    payments: [],
    deliveries: [],
    changeRequests: [],
    aiReviews: [],
    timelineEvents: [],
    ...overrides,
  };
}

export function makeMockPortalToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'token-1',
    agreementId: 'agreement-1',
    tokenHash: 'abcd1234hash',
    tokenPreview: 'xK9mP2vQ',
    type: 'AGREEMENT_INVITE',
    expiresAt: null,
    revokedAt: null,
    lastAccessedAt: null,
    ...overrides,
  };
}

export function buildPrismaMock(overrides: Record<string, unknown> = {}) {
  const txAgreementUpdate = jest
    .fn()
    .mockImplementation(({ data }) =>
      Promise.resolve(makeMockAgreement({ status: data.status })),
    );

  return {
    agreement: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    portalToken: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    delivery: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    milestone: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    timelineEvent: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((arg: unknown) => {
      if (typeof arg === 'function') {
        return arg({
          agreement: {
            update: txAgreementUpdate,
          },
        });
      }
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg;
    }),
  };
}

export function buildPaymentsServiceMock() {
  return {
    fundMilestone: jest.fn(),
    releasePayment: jest.fn(),
    portalFund: jest.fn(),
    portalReleaseConfirmation: jest.fn(),
    listByAgreementId: jest.fn(),
    getById: jest.fn(),
    getReceipt: jest.fn(),
  };
}

export function buildDeliveriesServiceMock() {
  return {
    acceptDeliveryFromPortal: jest.fn(),
    requestChangesFromPortal: jest.fn(),
    getDeliveryById: jest.fn(),
  };
}

export function buildTimelineServiceMock() {
  return {
    createEvent: jest.fn(),
    listByAgreementId: jest.fn(),
    listByPortalToken: jest.fn(),
  };
}

export function buildEmailServiceMock() {
  return {
    sendNotification: jest.fn(),
    resendAgreementInvite: jest.fn(),
  };
}

export function buildClsServiceMock(overrides: Record<string, unknown> = {}) {
  return {
    get: jest.fn(),
    getContext: jest.fn().mockReturnValue({
      agreementId: 'agreement-1',
      portalTokenId: 'token-1',
      portalTokenType: 'AGREEMENT_INVITE',
      ...overrides,
    }),
    setContext: jest.fn(),
  };
}

// ──────────────────────────────────────────────
//  Token fixture builders for Phase 5 token security tests
// ──────────────────────────────────────────────

/** Valid token — hash matches, not expired, not revoked */
export function makeValidTokenFixture(overrides: Record<string, unknown> = {}) {
  return makeMockPortalToken({
    tokenHash: 'valid-sha256-hash',
    expiresAt: null,
    revokedAt: null,
    ...overrides,
  });
}

/** Invalid / unknown token — hash not found in database */
export function makeUnknownTokenFixture() {
  return null; // Prisma returns null for unfound token
}

/** Expired token — expiresAt is in the past */
export function makeExpiredTokenFixture(
  overrides: Record<string, unknown> = {},
) {
  return makeMockPortalToken({
    tokenHash: 'expired-sha256-hash',
    expiresAt: new Date('2020-01-01'),
    revokedAt: null,
    ...overrides,
  });
}

/** Revoked token — revokedAt is set */
export function makeRevokedTokenFixture(
  overrides: Record<string, unknown> = {},
) {
  return makeMockPortalToken({
    tokenHash: 'revoked-sha256-hash',
    expiresAt: null,
    revokedAt: new Date('2026-01-15'),
    ...overrides,
  });
}

// ──────────────────────────────────────────────
//  Timeline evidence assertion helpers for Phase 5 audit checks
// ──────────────────────────────────────────────

/**
 * AR: يتحقق من أن حدث السجل الزمني الوحيد يطابق النوع والدور المتوقعين.
 * EN: Asserts a single timeline event matches the expected type and actor role.
 */
export function assertSingleTimelineEvent(
  timelineMock: ReturnType<typeof buildTimelineServiceMock>,
  expectedType: string,
  expectedActorRole: string = TimelineActorRole.CLIENT,
) {
  const calls = timelineMock.createEvent.mock.calls;
  expect(calls).toHaveLength(1);
  const [payload] = calls[0];
  expect(payload.type).toBe(expectedType);
  expect(payload.actorRole).toBe(expectedActorRole);
  expect(payload.agreementId).toBeDefined();
}

/**
 * AR: يتحقق من أن حدث السجل الزمني المحدد يطابق النوع والدور.
 * EN: Asserts a specific timeline event call matches the expected type and role.
 */
export function assertTimelineEventExists(
  timelineMock: ReturnType<typeof buildTimelineServiceMock>,
  expectedType: string,
  expectedActorRole: string = TimelineActorRole.CLIENT,
) {
  const matching = timelineMock.createEvent.mock.calls.filter(
    ([payload]: any) =>
      payload.type === expectedType && payload.actorRole === expectedActorRole,
  );
  expect(matching.length).toBe(1);
  const [payload] = matching[0];
  expect(payload.agreementId).toBeDefined();
  return payload;
}

/**
 * AR: يتحقق من عدم إنشاء أي أحداث سجل زمني مكررة.
 * EN: Asserts no duplicate timeline events were created for the same action.
 */
export function assertNoDuplicateTimelineEvents(
  timelineMock: ReturnType<typeof buildTimelineServiceMock>,
  expectedType: string,
) {
  const matching = timelineMock.createEvent.mock.calls.filter(
    ([payload]: any) => payload.type === expectedType,
  );
  expect(matching.length).toBeLessThanOrEqual(1);
}

/**
 * AR: يتحقق من عدم إنشاء أي أحداث سجل زمني (للحالات التي لا يجب فيها إنشاء أحداث).
 * EN: Asserts no timeline events were created (for no-side-effect checks).
 */
export function assertNoTimelineEvents(
  timelineMock: ReturnType<typeof buildTimelineServiceMock>,
) {
  expect(timelineMock.createEvent).not.toHaveBeenCalled();
}
