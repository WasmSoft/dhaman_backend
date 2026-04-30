import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ClientPortalController } from '../client-portal.controller';
import { ClientPortalService } from '../client-portal.service';
import { PortalTokenGuard } from '../../../common/guards/portal-token.guard';

export const VALID_TOKEN = 'xK9mP2vQ8nR5sT1wL4yB6fU3dC0aH7eJ2mN9pR5sT1wL4';
export const INVALID_TOKEN = 'invalid-token-value';
export const EXPIRED_TOKEN = 'expired-token-value';
export const REVOKED_TOKEN = 'revoked-token-value';
export const DELIVERY_UUID = '523e4567-e89b-12d3-a456-426614174000';
export const PAYMENT_UUID = '623e4567-e89b-12d3-a456-426614174000';
export const AGREEMENT_UUID = '223e4567-e89b-12d3-a456-426614174000';

export const PORTAL_ROUTES = [
  { method: 'GET', path: ':token/invite', handler: 'getInvite' },
  { method: 'POST', path: ':token/approve', handler: 'approve' },
  { method: 'POST', path: ':token/request-changes', handler: 'requestChanges' },
  { method: 'POST', path: ':token/reject', handler: 'rejectAgreement' },
  { method: 'GET', path: ':token', handler: 'getPortal' },
  {
    method: 'GET',
    path: ':token/deliveries/:deliveryId',
    handler: 'getDelivery',
  },
  {
    method: 'POST',
    path: ':token/deliveries/:deliveryId/accept',
    handler: 'acceptDelivery',
  },
  {
    method: 'POST',
    path: ':token/deliveries/:deliveryId/request-changes',
    handler: 'requestDeliveryChanges',
  },
  { method: 'GET', path: ':token/payments', handler: 'getPayments' },
  { method: 'POST', path: ':token/payments/:id/fund', handler: 'fundPayment' },
  {
    method: 'POST',
    path: ':token/payments/:id/release',
    handler: 'releasePayment',
  },
  {
    method: 'GET',
    path: ':token/payment-history',
    handler: 'getPaymentHistory',
  },
  { method: 'GET', path: ':token/timeline', handler: 'getTimeline' },
];

export class TestPortalTokenGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

export function makeClientPortalServiceMock() {
  return {
    createPortalToken: jest.fn(),
    getInvite: jest.fn(),
    approve: jest.fn(),
    requestChanges: jest.fn(),
    rejectAgreement: jest.fn(),
    getPortal: jest.fn(),
    getDelivery: jest.fn(),
    acceptDelivery: jest.fn(),
    requestDeliveryChanges: jest.fn(),
    getPayments: jest.fn(),
    fundPayment: jest.fn(),
    releasePayment: jest.fn(),
    getPaymentHistory: jest.fn(),
    getTimeline: jest.fn(),
  };
}

export async function createTestModule() {
  const serviceMock = makeClientPortalServiceMock();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [ClientPortalController],
    providers: [{ provide: ClientPortalService, useValue: serviceMock }],
  })
    .overrideGuard(PortalTokenGuard)
    .useClass(TestPortalTokenGuard)
    .compile();

  const controller = module.get<ClientPortalController>(ClientPortalController);

  return { module, controller, serviceMock };
}

// ──────────────────────────────────────────────
//  Safe-error assertion helpers (Phase 5)
// ──────────────────────────────────────────────

/**
 * AR: يتحقق من أن حمولة الخطأ لا تحتوي على بيانات حساسة (رموز خام، تجزئات، تتبعات).
 * EN: Asserts error payload does not contain sensitive data (raw tokens, hashes, stack traces).
 */
export function assertErrorPayloadIsSafe(errorPayload: any) {
  const serialized = JSON.stringify(errorPayload).toLowerCase();

  // Must not contain raw token values
  expect(serialized).not.toContain('xK9mP2vQ8nR');
  expect(serialized).not.toContain('tokenhash');
  expect(serialized).not.toContain('sha256');

  // Must not contain stack traces
  if (errorPayload.error?.details?.stack) {
    fail('Stack trace leaked in error payload');
  }

  // Must not contain private diagnostics
  if (errorPayload.error?.details?.originalError) {
    fail('Original error leaked in error payload');
  }
}

/**
 * AR: يتحقق من أن الخطأ يحمل الشفرة المتوقعة ورسالة آمنة.
 * EN: Asserts error has the expected code and a safe message.
 */
export function assertErrorCodeAndSafeMessage(
  error: any,
  expectedCode: string,
) {
  // Check via AppException shape
  if (error.code) {
    expect(error.code).toBe(expectedCode);
  } else if (error.error?.code) {
    // Check via HTTP exception filter shape
    expect(error.error.code).toBe(expectedCode);
  } else {
    // Check via toMatchObject in promise rejections
    expect(error).toMatchObject({ code: expectedCode });
  }
}

/**
 * AR: يتحقق من عدم تغيير حالة الأعمال عند فشل التحقق.
 * EN: Asserts business state was not changed after a validation failure.
 * Verifies that no write operations (update, create, delete) occurred.
 */
export function assertNoWriteSideEffects(prismaMock: any) {
  const writeOps = [
    'create',
    'update',
    'delete',
    'upsert',
    'createMany',
    'updateMany',
    'deleteMany',
  ];

  for (const model of Object.values(prismaMock)) {
    if (typeof model !== 'object' || model === null) continue;
    for (const op of writeOps) {
      if (typeof model[op] === 'function') {
        expect(model[op]).not.toHaveBeenCalled();
      }
    }
  }
}

/**
 * AR: يتحقق من أن خطأ الاستجابة يحتوي على شفرة ثابتة ورسالة آمنة.
 * EN: Validates a response error object has a stable code and non-empty message.
 */
export function assertStableErrorResponse(body: any, expectedCode: string) {
  expect(body.success).toBe(false);
  expect(body.error).toBeDefined();
  expect(body.error.code).toBe(expectedCode);
  expect(typeof body.error.message).toBe('string');
  expect(body.error.message.length).toBeGreaterThan(0);
  // Must not leak sensitive data
  assertErrorPayloadIsSafe(body);
}
