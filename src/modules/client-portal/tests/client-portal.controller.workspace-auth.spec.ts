import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';
import { createTestModule } from './client-portal.controller.test-utils';
import {
  VALID_TOKEN,
  AGREEMENT_A_UUID,
  AGREEMENT_B_UUID,
  mockWorkspaceResponse,
} from './client-portal.controller.fixtures';
import type { ClientPortalService } from '../client-portal.service';
import type { ClientPortalController } from '../client-portal.controller';

describe('ClientPortalController — workspace token-error propagation (US3)', () => {
  let controller: ClientPortalController;
  let serviceMock: ReturnType<typeof jest.mocked<ClientPortalService>>;

  beforeEach(async () => {
    const result = await createTestModule();
    controller = result.controller;
    serviceMock = result.serviceMock as any;
  });

  it('should propagate PORTAL_TOKEN_INVALID from getPortal service call', async () => {
    serviceMock.getPortal.mockRejectedValue(
      new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID }),
    );

    await expect(controller.getPortal(VALID_TOKEN)).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_INVALID,
    });
  });

  it('should propagate PORTAL_TOKEN_EXPIRED from getPortal service call', async () => {
    serviceMock.getPortal.mockRejectedValue(
      new AppException({ code: ErrorCode.PORTAL_TOKEN_EXPIRED }),
    );

    await expect(controller.getPortal(VALID_TOKEN)).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_EXPIRED,
    });
  });

  it('should propagate PORTAL_TOKEN_REVOKED from getPortal service call', async () => {
    serviceMock.getPortal.mockRejectedValue(
      new AppException({ code: ErrorCode.PORTAL_TOKEN_REVOKED }),
    );

    await expect(controller.getPortal(VALID_TOKEN)).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_REVOKED,
    });
  });

  it('should return workspace scoped to token agreement A only', async () => {
    const workspaceA = {
      ...mockWorkspaceResponse,
      agreementId: AGREEMENT_A_UUID,
      title: 'Agreement A Workspace',
    };
    serviceMock.getPortal.mockResolvedValue(workspaceA);

    const result = await controller.getPortal(VALID_TOKEN);

    expect(result.agreementId).toBe(AGREEMENT_A_UUID);
    expect(result.agreementId).not.toBe(AGREEMENT_B_UUID);
    expect(serviceMock.getPortal).toHaveBeenCalledWith(VALID_TOKEN);
  });

  it('should propagate AGREEMENT_NOT_FOUND when token agreement deleted', async () => {
    serviceMock.getPortal.mockRejectedValue(
      new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND }),
    );

    await expect(controller.getPortal(VALID_TOKEN)).rejects.toMatchObject({
      code: ErrorCode.AGREEMENT_NOT_FOUND,
    });
  });
});
