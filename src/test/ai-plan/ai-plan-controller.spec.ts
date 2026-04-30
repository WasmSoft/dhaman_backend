import { INestApplication, NotFoundException } from '@nestjs/common';
import {
  VALID_GENERATED_PLAN_RESPONSE,
  createAiPlanHttpTestApp,
  closeAiPlanHttpTestApp,
} from './ai-plan-controller-test-utils';

describe('AiPlanController', () => {
  let app: INestApplication;
  let request: ReturnType<typeof createAiPlanHttpTestApp> extends Promise<{
    request: infer R;
  }>
    ? R
    : never;
  let authHeader: string;
  let aiPlanServiceMock: {
    generatePlan: jest.Mock;
    generatePlanForAgreement: jest.Mock;
  };

  beforeEach(async () => {
    aiPlanServiceMock = {
      generatePlan: jest.fn(),
      generatePlanForAgreement: jest.fn(),
    };

    const testContext = await createAiPlanHttpTestApp(aiPlanServiceMock);
    app = testContext.app;
    request = testContext.request;
    authHeader = testContext.authHeader;
  });

  afterEach(async () => {
    await closeAiPlanHttpTestApp(app);
  });

  describe('POST /api/v1/ai/generate-payment-plan (US1)', () => {
    const VALID_DESCRIPTION =
      'تصميم متجر إلكتروني متكامل مع بوابة دفع ولوحة تحكم. يمتد المشروع على مدى 3 أشهر.';

    it('should return 201 and GeneratedPlanResponseDto on valid authenticated request', async () => {
      aiPlanServiceMock.generatePlan.mockResolvedValue(
        VALID_GENERATED_PLAN_RESPONSE,
      );

      const response = await request
        .post('/api/v1/ai/generate-payment-plan')
        .set('Authorization', authHeader)
        .send({ projectDescription: VALID_DESCRIPTION });

      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty('data');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data).toHaveProperty('id');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data).toHaveProperty('milestones');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data).toHaveProperty('policies');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data).toHaveProperty('ambiguityWarnings');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data).toHaveProperty('clarityScore');
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request
        .post('/api/v1/ai/generate-payment-plan')
        .send({ projectDescription: VALID_DESCRIPTION });

      expect(response.status).toBe(401);
    });

    it('should return 400 when projectDescription is shorter than 20 characters', async () => {
      const response = await request
        .post('/api/v1/ai/generate-payment-plan')
        .set('Authorization', authHeader)
        .send({ projectDescription: 'قصير' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/agreements/:id/generate-plan (US2)', () => {
    const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

    it('should return 201 and GeneratedPlanResponseDto on valid authenticated request', async () => {
      aiPlanServiceMock.generatePlanForAgreement.mockResolvedValue(
        VALID_GENERATED_PLAN_RESPONSE,
      );

      const response = await request
        .post(`/api/v1/agreements/${VALID_UUID}/generate-plan`)
        .set('Authorization', authHeader)
        .send({});

      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty('data');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data).toHaveProperty('id');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data).toHaveProperty('milestones');
    });

    it('should return 404 when service throws NotFoundException', async () => {
      aiPlanServiceMock.generatePlanForAgreement.mockRejectedValue(
        new NotFoundException('Agreement not found.'),
      );

      const response = await request
        .post(`/api/v1/agreements/${VALID_UUID}/generate-plan`)
        .set('Authorization', authHeader)
        .send({});

      expect(response.status).toBe(404);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request
        .post(`/api/v1/agreements/${VALID_UUID}/generate-plan`)
        .send({});

      expect(response.status).toBe(401);
    });
  });
});
