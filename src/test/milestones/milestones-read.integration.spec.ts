import { AppException } from '../../common/errors/app-exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import {
  closeHttpTestApp,
  createMilestonesHttpTestApp,
} from './milestones-http-test-utils';
import {
  TEST_AGREEMENT_ID,
  TEST_MILESTONE_ID,
  TEST_REQUEST_ID,
  TEST_USER_ID,
  makeMilestoneResponse,
} from './milestones-test-utils';

describe('MilestonesController GET milestone read endpoints', () => {
  it('returns 200 for get-one and list and forwards the authenticated user', async () => {
    const milestonesService = {
      getAgreementMilestones: jest.fn().mockResolvedValue({
        agreementTotalAmount: '7500.00',
        amountMatch: true,
        currency: 'SAR',
        milestones: [makeMilestoneResponse()],
        totalAmount: '7500.00',
      }),
      getMilestone: jest.fn().mockResolvedValue({
        data: makeMilestoneResponse(),
      }),
    };
    const { app, authHeader, request } =
      await createMilestonesHttpTestApp(milestonesService);

    try {
      const getOneResponse = await request
        .get(`/api/v1/milestones/${TEST_MILESTONE_ID}`)
        .set('Authorization', authHeader)
        .expect(200);
      const listResponse = await request
        .get(`/api/v1/agreements/${TEST_AGREEMENT_ID}/milestones`)
        .set('Authorization', authHeader)
        .expect(200);
      const getOneBody = getOneResponse.body as {
        data: { data: { id: string } };
        meta: { requestId: string };
        success: boolean;
      };
      const listBody = listResponse.body as {
        data: {
          agreementTotalAmount: string;
          milestones: Array<{ id: string }>;
          totalAmount: string;
        };
        meta: { requestId: string };
        success: boolean;
      };

      expect(milestonesService.getMilestone).toHaveBeenCalledWith(
        TEST_MILESTONE_ID,
        TEST_USER_ID,
      );
      expect(milestonesService.getAgreementMilestones).toHaveBeenCalledWith(
        TEST_AGREEMENT_ID,
        TEST_USER_ID,
      );
      expect(getOneBody.success).toBe(true);
      expect(getOneBody.meta.requestId).toBe(TEST_REQUEST_ID);
      expect(getOneBody.data.data.id).toBe(TEST_MILESTONE_ID);
      expect(listBody.success).toBe(true);
      expect(listBody.meta.requestId).toBe(TEST_REQUEST_ID);
      expect(listBody.data.agreementTotalAmount).toBe('7500.00');
      expect(listBody.data.totalAmount).toBe('7500.00');
      expect(listBody.data.milestones[0]?.id).toBe(TEST_MILESTONE_ID);
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 401 when the bearer token is missing', async () => {
    const { app, request } = await createMilestonesHttpTestApp({
      getAgreementMilestones: jest.fn(),
      getMilestone: jest.fn(),
    });

    try {
      await request.get(`/api/v1/milestones/${TEST_MILESTONE_ID}`).expect(401);
      await request
        .get(`/api/v1/agreements/${TEST_AGREEMENT_ID}/milestones`)
        .expect(401);
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 400 VALIDATION_ERROR for invalid UUID path parameters', async () => {
    const milestonesService = {
      getAgreementMilestones: jest.fn(),
      getMilestone: jest.fn(),
    };
    const { app, authHeader, request } =
      await createMilestonesHttpTestApp(milestonesService);

    try {
      await request
        .get('/api/v1/milestones/not-a-uuid')
        .set('Authorization', authHeader)
        .expect(400);

      await request
        .get('/api/v1/agreements/not-a-uuid/milestones')
        .set('Authorization', authHeader)
        .expect(400);

      expect(milestonesService.getMilestone).not.toHaveBeenCalled();
      expect(milestonesService.getAgreementMilestones).not.toHaveBeenCalled();
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('maps MILESTONE_NOT_FOUND and AGREEMENT_NOT_FOUND to 404', async () => {
    const { app, authHeader, request } = await createMilestonesHttpTestApp({
      getAgreementMilestones: jest
        .fn()
        .mockRejectedValue(
          new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND }),
        ),
      getMilestone: jest
        .fn()
        .mockRejectedValue(
          new AppException({ code: ErrorCode.MILESTONE_NOT_FOUND }),
        ),
    });

    try {
      await request
        .get(`/api/v1/milestones/${TEST_MILESTONE_ID}`)
        .set('Authorization', authHeader)
        .expect(404);

      await request
        .get(`/api/v1/agreements/${TEST_AGREEMENT_ID}/milestones`)
        .set('Authorization', authHeader)
        .expect(404);
    } finally {
      await closeHttpTestApp(app);
    }
  });
});
