import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';
import { createTestModule } from './client-portal.controller.test-utils';
import { VALID_TOKEN } from './client-portal.controller.fixtures';
import type { ClientPortalService } from '../client-portal.service';
import type { ClientPortalController } from '../client-portal.controller';

describe('ClientPortalController — invite token-error propagation (US1)', () => {
  let controller: ClientPortalController;
  let serviceMock: ReturnType<typeof jest.mocked<ClientPortalService>>;

  beforeEach(async () => {
    const result = await createTestModule();
    controller = result.controller;
    serviceMock = result.serviceMock as any;
  });

  it('should propagate PORTAL_TOKEN_INVALID from getInvite service call', async () => {
    serviceMock.getInvite.mockRejectedValue(
      new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID }),
    );

    await expect(controller.getInvite(VALID_TOKEN)).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_INVALID,
    });
  });

  it('should propagate PORTAL_TOKEN_EXPIRED from getInvite service call', async () => {
    serviceMock.getInvite.mockRejectedValue(
      new AppException({ code: ErrorCode.PORTAL_TOKEN_EXPIRED }),
    );

    await expect(controller.getInvite(VALID_TOKEN)).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_EXPIRED,
    });
  });

  it('should propagate PORTAL_TOKEN_REVOKED from getInvite service call', async () => {
    serviceMock.getInvite.mockRejectedValue(
      new AppException({ code: ErrorCode.PORTAL_TOKEN_REVOKED }),
    );

    await expect(controller.getInvite(VALID_TOKEN)).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_REVOKED,
    });
  });
});
