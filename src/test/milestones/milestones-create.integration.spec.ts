import { AppException } from '../../common/errors/app-exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import {
  closeHttpTestApp,
  createMilestonesHttpTestApp,
} from './milestones-http-test-utils';
import {
  TEST_AGREEMENT_ID,
  TEST_REQUEST_ID,
  TEST_USER_ID,
  makeCreateMilestoneDto,
  makeMilestoneResponse,
} from './milestones-test-utils';

describe('MilestonesController POST /api/v1/agreements/:agreementId/milestones', () => {
  it('returns 201, wraps the response, and passes the authenticated user to the service', async () => {
    const milestonesService = {
      createMilestone: jest.fn().mockResolvedValue({
        amountWarning: 'Milestone total does not match agreement total',
        data: makeMilestoneResponse(),
      }),
    };
    const { app, authHeader, request } =
      await createMilestonesHttpTestApp(milestonesService);

    try {
      const response = await request
        .post(`/api/v1/agreements/${TEST_AGREEMENT_ID}/milestones`)
        .set('Authorization', authHeader)
        .send(makeCreateMilestoneDto())
        .expect(201);
      const body = response.body as {
        data: {
          amountWarning: string;
          data: { agreementId: string; id: string; orderIndex: number };
        };
        meta: { requestId: string };
        success: boolean;
      };

      expect(milestonesService.createMilestone).toHaveBeenCalledWith(
        TEST_AGREEMENT_ID,
        makeCreateMilestoneDto(),
        TEST_USER_ID,
      );
      expect(body.success).toBe(true);
      expect(body.meta.requestId).toBe(TEST_REQUEST_ID);
      expect(body.data.amountWarning).toBe(
        'Milestone total does not match agreement total',
      );
      expect(body.data.data.agreementId).toBe(TEST_AGREEMENT_ID);
      expect(body.data.data.orderIndex).toBe(1);
      expect(typeof body.data.data.id).toBe('string');
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 401 when the bearer token is missing', async () => {
    const { app, request } = await createMilestonesHttpTestApp({
      createMilestone: jest.fn(),
    });

    try {
      const response = await request
        .post(`/api/v1/agreements/${TEST_AGREEMENT_ID}/milestones`)
        .send(makeCreateMilestoneDto())
        .expect(401);

      expect(response.body).toMatchObject({
        error: { code: ErrorCode.UNAUTHORIZED },
        success: false,
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 400 VALIDATION_ERROR when acceptanceCriteria is missing', async () => {
    const milestonesService = {
      createMilestone: jest.fn(),
    };
    const { app, authHeader, request } =
      await createMilestonesHttpTestApp(milestonesService);

    try {
      const payload = makeCreateMilestoneDto();
      delete (payload as Partial<typeof payload>).acceptanceCriteria;

      const response = await request
        .post(`/api/v1/agreements/${TEST_AGREEMENT_ID}/milestones`)
        .set('Authorization', authHeader)
        .send(payload)
        .expect(400);

      expect(milestonesService.createMilestone).not.toHaveBeenCalled();
      expect(response.body).toMatchObject({
        error: { code: ErrorCode.VALIDATION_ERROR },
        success: false,
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('maps AGREEMENT_NOT_FOUND to 404', async () => {
    const { app, authHeader, request } = await createMilestonesHttpTestApp({
      createMilestone: jest
        .fn()
        .mockRejectedValue(
          new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND }),
        ),
    });

    try {
      const response = await request
        .post(`/api/v1/agreements/${TEST_AGREEMENT_ID}/milestones`)
        .set('Authorization', authHeader)
        .send(makeCreateMilestoneDto())
        .expect(404);

      expect(response.body).toMatchObject({
        error: { code: ErrorCode.AGREEMENT_NOT_FOUND },
        success: false,
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('maps AGREEMENT_CANNOT_BE_MODIFIED to 409', async () => {
    const { app, authHeader, request } = await createMilestonesHttpTestApp({
      createMilestone: jest
        .fn()
        .mockRejectedValue(
          new AppException({ code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED }),
        ),
    });

    try {
      const response = await request
        .post(`/api/v1/agreements/${TEST_AGREEMENT_ID}/milestones`)
        .set('Authorization', authHeader)
        .send(makeCreateMilestoneDto())
        .expect(409);

      expect(response.body).toMatchObject({
        error: { code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED },
        success: false,
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('maps MILESTONE_INVALID_ORDER to 409', async () => {
    const { app, authHeader, request } = await createMilestonesHttpTestApp({
      createMilestone: jest
        .fn()
        .mockRejectedValue(
          new AppException({ code: ErrorCode.MILESTONE_INVALID_ORDER }),
        ),
    });

    try {
      const response = await request
        .post(`/api/v1/agreements/${TEST_AGREEMENT_ID}/milestones`)
        .set('Authorization', authHeader)
        .send(makeCreateMilestoneDto())
        .expect(409);

      expect(response.body).toMatchObject({
        error: { code: ErrorCode.MILESTONE_INVALID_ORDER },
        success: false,
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });
});
