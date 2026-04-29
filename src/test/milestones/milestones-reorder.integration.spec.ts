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
  makeReorderMilestonesDto,
} from './milestones-test-utils';

describe('MilestonesController PATCH /api/v1/milestones/:id/reorder', () => {
  it('returns 200 for a valid reorder request and forwards the authenticated user', async () => {
    const dto = makeReorderMilestonesDto();
    const milestonesService = {
      reorderMilestones: jest.fn().mockResolvedValue({
        data: [
          makeMilestoneResponse({
            id: dto.milestones[0].milestoneId,
            orderIndex: 1,
          }),
          makeMilestoneResponse({
            id: dto.milestones[1].milestoneId,
            orderIndex: 2,
          }),
          makeMilestoneResponse({
            id: dto.milestones[2].milestoneId,
            orderIndex: 3,
          }),
        ],
      }),
    };
    const { app, authHeader, request } =
      await createMilestonesHttpTestApp(milestonesService);

    try {
      const response = await request
        .patch(`/api/v1/milestones/${TEST_MILESTONE_ID}/reorder`)
        .set('Authorization', authHeader)
        .send(dto)
        .expect(200);

      expect(milestonesService.reorderMilestones).toHaveBeenCalledWith(
        TEST_MILESTONE_ID,
        dto,
        TEST_USER_ID,
      );
      expect(response.body).toEqual({
        data: {
          data: [
            expect.objectContaining({ orderIndex: 1 }),
            expect.objectContaining({ orderIndex: 2 }),
            expect.objectContaining({ orderIndex: 3 }),
          ],
        },
        meta: { requestId: TEST_REQUEST_ID },
        success: true,
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 400 VALIDATION_ERROR for malformed reorder bodies', async () => {
    const milestonesService = {
      reorderMilestones: jest.fn(),
    };
    const { app, authHeader, request } =
      await createMilestonesHttpTestApp(milestonesService);

    try {
      const response = await request
        .patch(`/api/v1/milestones/${TEST_MILESTONE_ID}/reorder`)
        .set('Authorization', authHeader)
        .send({ milestones: [{ milestoneId: 'not-a-uuid', orderIndex: 0 }] })
        .expect(400);

      expect(milestonesService.reorderMilestones).not.toHaveBeenCalled();
      expect(response.body).toMatchObject({
        error: { code: ErrorCode.VALIDATION_ERROR },
        success: false,
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 401 when the bearer token is missing', async () => {
    const { app, request } = await createMilestonesHttpTestApp({
      reorderMilestones: jest.fn(),
    });

    try {
      await request
        .patch(`/api/v1/milestones/${TEST_MILESTONE_ID}/reorder`)
        .send(makeReorderMilestonesDto())
        .expect(401);
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('maps MILESTONE_NOT_FOUND to 404', async () => {
    const { app, authHeader, request } = await createMilestonesHttpTestApp({
      reorderMilestones: jest
        .fn()
        .mockRejectedValue(
          new AppException({ code: ErrorCode.MILESTONE_NOT_FOUND }),
        ),
    });

    try {
      await request
        .patch(`/api/v1/milestones/${TEST_MILESTONE_ID}/reorder`)
        .set('Authorization', authHeader)
        .send(makeReorderMilestonesDto())
        .expect(404);
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('maps MILESTONE_INVALID_ORDER to 409', async () => {
    const { app, authHeader, request } = await createMilestonesHttpTestApp({
      reorderMilestones: jest
        .fn()
        .mockRejectedValue(
          new AppException({ code: ErrorCode.MILESTONE_INVALID_ORDER }),
        ),
    });

    try {
      await request
        .patch(`/api/v1/milestones/${TEST_MILESTONE_ID}/reorder`)
        .set('Authorization', authHeader)
        .send(makeReorderMilestonesDto())
        .expect(409);
    } finally {
      await closeHttpTestApp(app);
    }
  });
});
