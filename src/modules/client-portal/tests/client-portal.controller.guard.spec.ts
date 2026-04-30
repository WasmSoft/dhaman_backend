import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ClientPortalController } from '../client-portal.controller';
import { PortalTokenGuard } from '../../../common/guards/portal-token.guard';
import { createHash } from 'crypto';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { ActorType } from '../../../common/enums/actor-type.enum';

describe('ClientPortalController — guard metadata', () => {
  it('should define PortalTokenGuard on every portal route', () => {
    const guardMetadata: Array<{ route: string; guards: string[] }> = [];
    const prototype = ClientPortalController.prototype;

    for (const key of Object.getOwnPropertyNames(prototype)) {
      if (key === 'constructor') continue;
      const guards = Reflect.getMetadata('__guards__', prototype[key]);
      if (guards) {
        const routePath = Reflect.getMetadata('path', prototype[key]);
        const method = Reflect.getMetadata('method', prototype[key]);
        const guardNames = guards.map((g: { name: string }) => g.name);
        guardMetadata.push({
          route: `${method ?? '?'} ${routePath ?? '?'}`,
          guards: guardNames,
        });
      }
    }

    expect(guardMetadata.length).toBeGreaterThan(0);

    for (const entry of guardMetadata) {
      expect(entry.guards).toContain('PortalTokenGuard');
    }
  });

  it('should have no route-handler method without PortalTokenGuard', () => {
    const prototype = ClientPortalController.prototype;

    for (const key of Object.getOwnPropertyNames(prototype)) {
      if (key === 'constructor') continue;
      const guards = Reflect.getMetadata('__guards__', prototype[key]);
      if (guards) {
        const guardNames = guards.map((g: { name: string }) => g.name);
        expect(guardNames).toContain('PortalTokenGuard');
      }
    }
  });
});

// ──────────────────────────────────────────────────────────────
//  PortalTokenGuard behavior-level tests (US1)
// ──────────────────────────────────────────────────────────────

describe('PortalTokenGuard — token rejection (US1)', () => {
  let guard: PortalTokenGuard;
  let prismaMock: any;
  let clsMock: any;

  beforeEach(() => {
    prismaMock = {
      portalToken: {
        findUnique: jest.fn(),
      },
    };

    clsMock = {
      setContext: jest.fn(),
    };

    guard = new PortalTokenGuard(clsMock, prismaMock);
  });

  function makeExecutionContext(token?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          params: token !== undefined ? { token } : {},
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should reject requests with no token param', async () => {
    prismaMock.portalToken.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(makeExecutionContext(undefined)),
    ).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_INVALID,
    });
  });

  it('should reject requests with empty token string', async () => {
    prismaMock.portalToken.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(makeExecutionContext('')),
    ).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_INVALID,
    });
  });

  it('should reject requests where token hash is not found (invalid token)', async () => {
    prismaMock.portalToken.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(makeExecutionContext('invalid-token-value')),
    ).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_INVALID,
    });
  });

  it('should reject requests with expired token', async () => {
    prismaMock.portalToken.findUnique.mockResolvedValue({
      id: 'token-1',
      agreementId: 'agreement-1',
      type: 'AGREEMENT_INVITE',
      expiresAt: new Date('2020-01-01'),
      revokedAt: null,
    });

    await expect(
      guard.canActivate(makeExecutionContext('expired-token-value')),
    ).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_EXPIRED,
    });
  });

  it('should reject requests with revoked token', async () => {
    prismaMock.portalToken.findUnique.mockResolvedValue({
      id: 'token-1',
      agreementId: 'agreement-1',
      type: 'AGREEMENT_INVITE',
      expiresAt: null,
      revokedAt: new Date('2026-01-15'),
    });

    await expect(
      guard.canActivate(makeExecutionContext('revoked-token-value')),
    ).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_REVOKED,
    });
  });

  it('should allow valid non-expired non-revoked token and set CLS context', async () => {
    const portalToken = {
      id: 'token-1',
      agreementId: 'agreement-1',
      type: 'AGREEMENT_INVITE',
      expiresAt: null,
      revokedAt: null,
    };
    prismaMock.portalToken.findUnique.mockResolvedValue(portalToken);

    const result = await guard.canActivate(
      makeExecutionContext('valid-token-value'),
    );

    expect(result).toBe(true);
    expect(clsMock.setContext).toHaveBeenCalledWith({
      actorType: ActorType.CLIENT_PORTAL,
      portalTokenId: 'token-1',
      agreementId: 'agreement-1',
      portalTokenType: 'AGREEMENT_INVITE',
    });
  });

  it('should allow token with future expiry', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    prismaMock.portalToken.findUnique.mockResolvedValue({
      id: 'token-1',
      agreementId: 'agreement-1',
      type: 'AGREEMENT_INVITE',
      expiresAt: futureDate,
      revokedAt: null,
    });

    const result = await guard.canActivate(
      makeExecutionContext('future-expiry-token'),
    );

    expect(result).toBe(true);
  });

  it('should hash the incoming token with sha256 before lookup', async () => {
    prismaMock.portalToken.findUnique.mockResolvedValue({
      id: 'token-1',
      agreementId: 'agreement-1',
      type: 'AGREEMENT_INVITE',
      expiresAt: null,
      revokedAt: null,
    });

    const rawToken = 'some-raw-token-value';
    await guard.canActivate(makeExecutionContext(rawToken));

    const expectedHash = createHash('sha256').update(rawToken).digest('hex');
    expect(prismaMock.portalToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: expectedHash },
      select: expect.objectContaining({
        id: true,
        agreementId: true,
        type: true,
        expiresAt: true,
        revokedAt: true,
      }),
    });
  });
});
