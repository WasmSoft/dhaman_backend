import { ClientPortalController } from '../client-portal.controller';
import { PORTAL_ROUTES } from './client-portal.controller.test-utils';

describe('ClientPortalController — Swagger metadata', () => {
  const prototype = ClientPortalController.prototype;

  it('should apply @ApiTags("Client Portal") to the controller class', () => {
    const tags = Reflect.getMetadata('swagger/apiUseTags', ClientPortalController);
    expect(tags).toBeDefined();
    if (Array.isArray(tags)) {
      expect(tags).toContain('Client Portal');
    }
  });

  it('should have @ApiOperation on every portal route', () => {
    for (const route of PORTAL_ROUTES) {
      const apiOperation = Reflect.getMetadata(
        'swagger/apiOperation',
        prototype[route.handler],
      );
      expect(apiOperation).toBeDefined();
    }
  });

  it('should not have @ApiBearerAuth on any portal route', () => {
    for (const route of PORTAL_ROUTES) {
      const authMeta = Reflect.getMetadata(
        'swagger/apiBearer',
        prototype[route.handler],
      );
      expect(authMeta).toBeUndefined();
    }
  });

  it('should have all 13 portal routes registered', () => {
    expect(PORTAL_ROUTES.length).toBe(13);
  });

  it('should have non-empty operation summary on every route', () => {
    for (const route of PORTAL_ROUTES) {
      const apiOperation = Reflect.getMetadata(
        'swagger/apiOperation',
        prototype[route.handler],
      );
      expect(apiOperation).toBeDefined();
      expect(apiOperation.summary).toBeDefined();
      expect(typeof apiOperation.summary).toBe('string');
      expect(apiOperation.summary.length).toBeGreaterThan(0);
    }
  });

  it('should have body-bearing routes accepting more params than token-only routes', () => {
    // Body-bearing routes accept token + dto; read-only routes accept token only
    const bodyRoutes = [
      'requestChanges',
      'rejectAgreement',
      'requestDeliveryChanges',
      'fundPayment',
      'releasePayment',
    ];
    const readRoutes = ['getInvite', 'approve', 'getPortal', 'getPayments', 'getPaymentHistory', 'getTimeline'];

    for (const handler of bodyRoutes) {
      const fn = prototype[handler];
      expect(fn).toBeDefined();
      // Body-bearing routes accept more than 1 argument (token + dto/body)
      expect(fn.length).toBeGreaterThan(1);
    }

    for (const handler of readRoutes) {
      const fn = prototype[handler];
      expect(fn).toBeDefined();
      // Read-only routes accept only the token argument
      expect(fn.length).toBe(1);
    }
  });

  it('should have route paths starting with :token', () => {
    for (const route of PORTAL_ROUTES) {
      expect(route.path.startsWith(':token')).toBe(true);
    }
  });
});
