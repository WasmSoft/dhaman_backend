import { AppException } from '../../common/errors/app-exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import {
  closeHttpTestApp,
  createMilestonesHttpTestApp,
} from './milestones-http-test-utils';
import {
  TEST_MILESTONE_ID,
  TEST_REQUEST_ID,
  TEST_USER_ID,
  makeMilestoneResponse,
  makeUpdateMilestoneDto,
} from './milestones-test-utils';

describe('MilestonesController PATCH and DELETE milestone endpoints', () => {
  it('returns 200 for PATCH and forwards the authenticated user', async () => {
    const milestonesService = {
      updateMilestone: jest.fn().mockResolvedValue({
        amountWarning: 'Milestone total does not match agreement total',
        data: makeMilestoneResponse({
          amount: '2750.00',
          title: 'Updated title',
        }),
      }),
    };
    const { app, authHeader, request } =
      await createMilestonesHttpTestApp(milestonesService);

    try {
      const dto = makeUpdateMilestoneDto();
      const response = await request
        .patch(`/api/v1/milestones/${TEST_MILESTONE_ID}`)
        .set('Authorization', authHeader)
        .send(dto)
        .expect(200);
      const body = response.body as {
        data: {
          amountWarning: string;
          data: { amount: string; title: string };
        };
        meta: { requestId: string };
        success: boolean;
      };

      expect(milestonesService.updateMilestone).toHaveBeenCalledWith(
        TEST_MILESTONE_ID,
        dto,
        TEST_USER_ID,
      );
      expect(body.success).toBe(true);
      expect(body.meta.requestId).toBe(TEST_REQUEST_ID);
      expect(body.data.amountWarning).toBe(
        'Milestone total does not match agreement total',
      );
      expect(body.data.data.amount).toBe('2750.00');
      expect(body.data.data.title).toBe('Updated title');
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 200 for DELETE and forwards the authenticated user', async () => {
    const milestonesService = {
      deleteMilestone: jest.fn().mockResolvedValue({ success: true }),
    };
    const { app, authHeader, request } =
      await createMilestonesHttpTestApp(milestonesService);

    try {
      const response = await request
        .delete(`/api/v1/milestones/${TEST_MILESTONE_ID}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(milestonesService.deleteMilestone).toHaveBeenCalledWith(
        TEST_MILESTONE_ID,
        TEST_USER_ID,
      );
      expect(response.body).toEqual({ success: true });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 401 for PATCH and DELETE when the bearer token is missing', async () => {
    const { app, request } = await createMilestonesHttpTestApp({
      deleteMilestone: jest.fn(),
      updateMilestone: jest.fn(),
    });

    try {
      await request
        .patch(`/api/v1/milestones/${TEST_MILESTONE_ID}`)
        .send(makeUpdateMilestoneDto())
        .expect(401);

      await request
        .delete(`/api/v1/milestones/${TEST_MILESTONE_ID}`)
        .expect(401);
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 400 VALIDATION_ERROR for invalid PATCH body', async () => {
    const milestonesService = {
      updateMilestone: jest.fn(),
    };
    const { app, authHeader, request } =
      await createMilestonesHttpTestApp(milestonesService);

    try {
      const response = await request
        .patch(`/api/v1/milestones/${TEST_MILESTONE_ID}`)
        .set('Authorization', authHeader)
        .send({ acceptanceCriteria: [] })
        .expect(400);

      expect(milestonesService.updateMilestone).not.toHaveBeenCalled();
      expect(response.body).toMatchObject({
        error: { code: ErrorCode.VALIDATION_ERROR },
        success: false,
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('maps MILESTONE_NOT_FOUND to 404 for PATCH and DELETE', async () => {
    const { app, authHeader, request } = await createMilestonesHttpTestApp({
      deleteMilestone: jest
        .fn()
        .mockRejectedValue(
          new AppException({ code: ErrorCode.MILESTONE_NOT_FOUND }),
        ),
      updateMilestone: jest
        .fn()
        .mockRejectedValue(
          new AppException({ code: ErrorCode.MILESTONE_NOT_FOUND }),
        ),
    });

    try {
      await request
        .patch(`/api/v1/milestones/${TEST_MILESTONE_ID}`)
        .set('Authorization', authHeader)
        .send(makeUpdateMilestoneDto())
        .expect(404);

      await request
        .delete(`/api/v1/milestones/${TEST_MILESTONE_ID}`)
        .set('Authorization', authHeader)
        .expect(404);
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('maps AGREEMENT_CANNOT_BE_MODIFIED and MILESTONE_PAYMENT_NOT_WAITING to 409', async () => {
    const { app, authHeader, request } = await createMilestonesHttpTestApp({
      deleteMilestone: jest
        .fn()
        .mockRejectedValue(
          new AppException({ code: ErrorCode.MILESTONE_PAYMENT_NOT_WAITING }),
        ),
      updateMilestone: jest
        .fn()
        .mockRejectedValue(
          new AppException({ code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED }),
        ),
    });

    try {
      await request
        .patch(`/api/v1/milestones/${TEST_MILESTONE_ID}`)
        .set('Authorization', authHeader)
        .send(makeUpdateMilestoneDto())
        .expect(409);

      await request
        .delete(`/api/v1/milestones/${TEST_MILESTONE_ID}`)
        .set('Authorization', authHeader)
        .expect(409);
    } finally {
      await closeHttpTestApp(app);
    }
  });
});
