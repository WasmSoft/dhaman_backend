import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';
import { createTestModule } from './client-portal.controller.test-utils';
import { VALID_TOKEN } from './client-portal.controller.fixtures';
import type { ClientPortalService } from '../client-portal.service';
import type { ClientPortalController } from '../client-portal.controller';

describe('ClientPortalController — timeline token-error propagation (US5)', () => {
  let controller: ClientPortalController;
  let serviceMock: ReturnType<typeof jest.mocked<ClientPortalService>>;

  beforeEach(async () => {
    const result = await createTestModule();
    controller = result.controller;
    serviceMock = result.serviceMock as any;
  });

  it('should propagate PORTAL_TOKEN_INVALID from getTimeline service call', async () => {
    serviceMock.getTimeline.mockRejectedValue(
      new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID }),
    );

    await expect(controller.getTimeline(VALID_TOKEN)).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_INVALID,
    });
  });

  it('should propagate PORTAL_TOKEN_EXPIRED from getTimeline service call', async () => {
    serviceMock.getTimeline.mockRejectedValue(
      new AppException({ code: ErrorCode.PORTAL_TOKEN_EXPIRED }),
    );

    await expect(controller.getTimeline(VALID_TOKEN)).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_EXPIRED,
    });
  });

  it('should propagate PORTAL_TOKEN_REVOKED from getTimeline service call', async () => {
    serviceMock.getTimeline.mockRejectedValue(
      new AppException({ code: ErrorCode.PORTAL_TOKEN_REVOKED }),
    );

    await expect(controller.getTimeline(VALID_TOKEN)).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_REVOKED,
    });
  });
});
