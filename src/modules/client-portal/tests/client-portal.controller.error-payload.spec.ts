import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';
import {
  createTestModule,
  assertErrorPayloadIsSafe,
} from './client-portal.controller.test-utils';
import {
  VALID_TOKEN,
  INVALID_TOKEN,
  EXPIRED_TOKEN,
  REVOKED_TOKEN,
} from './client-portal.controller.fixtures';
import type { ClientPortalService } from '../client-portal.service';
import type { ClientPortalController } from '../client-portal.controller';

describe('ClientPortalController — error payload safety (US2)', () => {
  let controller: ClientPortalController;
  let serviceMock: ReturnType<typeof jest.mocked<ClientPortalService>>;

  beforeEach(async () => {
    const result = await createTestModule();
    controller = result.controller;
    serviceMock = result.serviceMock as any;
  });

  // ──────────────────────────────────────────────
  //  Token error payloads must not leak sensitive data
  // ──────────────────────────────────────────────

  describe('Token error payload safety', () => {
    it('PORTAL_TOKEN_INVALID error should not contain raw token or hash', async () => {
      serviceMock.getInvite.mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID }),
      );

      try {
        await controller.getInvite(VALID_TOKEN);
      } catch (error: any) {
        const serialized = JSON.stringify(error);
        expect(serialized).not.toContain(VALID_TOKEN);
        expect(serialized).not.toContain('sha256');
        expect(serialized).not.toContain('tokenHash');
        expect(error.code).toBe(ErrorCode.PORTAL_TOKEN_INVALID);
      }
    });

    it('PORTAL_TOKEN_EXPIRED error should not contain raw token or hash', async () => {
      serviceMock.getPortal.mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_EXPIRED }),
      );

      try {
        await controller.getPortal(EXPIRED_TOKEN);
      } catch (error: any) {
        const serialized = JSON.stringify(error);
        expect(serialized).not.toContain(EXPIRED_TOKEN);
        expect(serialized).not.toContain('tokenHash');
        expect(error.code).toBe(ErrorCode.PORTAL_TOKEN_EXPIRED);
      }
    });

    it('PORTAL_TOKEN_REVOKED error should not contain raw token or hash', async () => {
      serviceMock.getTimeline.mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_REVOKED }),
      );

      try {
        await controller.getTimeline(REVOKED_TOKEN);
      } catch (error: any) {
        const serialized = JSON.stringify(error);
        expect(serialized).not.toContain(REVOKED_TOKEN);
        expect(serialized).not.toContain('tokenHash');
        expect(error.code).toBe(ErrorCode.PORTAL_TOKEN_REVOKED);
      }
    });

    it('DELIVERY_NOT_FOUND error should not contain token values', async () => {
      serviceMock.getDelivery.mockRejectedValue(
        new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND }),
      );

      try {
        await controller.getDelivery(VALID_TOKEN, 'some-uuid');
      } catch (error: any) {
        const serialized = JSON.stringify(error);
        expect(serialized).not.toContain(VALID_TOKEN);
        expect(error.code).toBe(ErrorCode.DELIVERY_NOT_FOUND);
      }
    });

    it('PAYMENT_NOT_FOUND error should not contain token values', async () => {
      serviceMock.fundPayment.mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND }),
      );

      try {
        await controller.fundPayment(VALID_TOKEN, 'some-uuid', {
          amount: '100.00',
        });
      } catch (error: any) {
        const serialized = JSON.stringify(error);
        expect(serialized).not.toContain(VALID_TOKEN);
        expect(error.code).toBe(ErrorCode.PAYMENT_NOT_FOUND);
      }
    });
  });

  // ──────────────────────────────────────────────
  //  Error codes must be stable (string, not numeric)
  // ──────────────────────────────────────────────

  describe('Error code stability', () => {
    it('PORTAL_TOKEN_INVALID code is a stable string', async () => {
      serviceMock.getInvite.mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID }),
      );

      try {
        await controller.getInvite(VALID_TOKEN);
      } catch (error: any) {
        expect(error.code).toBe('PORTAL_TOKEN_INVALID');
        expect(typeof error.code).toBe('string');
      }
    });

    it('AGREEMENT_NOT_APPROVABLE code is a stable string', async () => {
      serviceMock.approve.mockRejectedValue(
        new AppException({ code: ErrorCode.AGREEMENT_NOT_APPROVABLE }),
      );

      try {
        await controller.approve(VALID_TOKEN);
      } catch (error: any) {
        expect(error.code).toBe('AGREEMENT_NOT_APPROVABLE');
        expect(typeof error.code).toBe('string');
      }
    });
  });

  // ──────────────────────────────────────────────
  //  Error messages must be non-empty strings
  // ──────────────────────────────────────────────

  describe('Error message presence', () => {
    it('should have a message field on AppException', async () => {
      serviceMock.getInvite.mockRejectedValue(
        new AppException({
          code: ErrorCode.PORTAL_TOKEN_INVALID,
          message: 'Portal token is invalid',
        }),
      );

      try {
        await controller.getInvite(VALID_TOKEN);
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });
});
