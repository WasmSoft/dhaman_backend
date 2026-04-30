import { INestApplication } from '@nestjs/common';
import {
  createDeliveriesHttpTestApp,
  TEST_AUTH_HEADER,
  TEST_MILESTONE_ID,
  TEST_DELIVERY_ID,
} from './deliveries-http-test-utils';

const VALID_MILESTONE = TEST_MILESTONE_ID;
const VALID_DELIVERY = TEST_DELIVERY_ID;

describe('Deliveries Dashboard HTTP', () => {
  let app: INestApplication;
  let serviceMock: Record<string, jest.Mock>;
  let httpRequest: ReturnType<typeof import('supertest')>;

  beforeAll(async () => {
    serviceMock = {
      createDelivery: jest
        .fn()
        .mockResolvedValue({ id: VALID_DELIVERY, status: 'DRAFT' }),
      listDeliveries: jest
        .fn()
        .mockResolvedValue({ deliveries: [], total: 0, page: 1, limit: 20 }),
      getDeliveryById: jest
        .fn()
        .mockResolvedValue({ id: VALID_DELIVERY, status: 'DRAFT' }),
      updateDelivery: jest
        .fn()
        .mockResolvedValue({ id: VALID_DELIVERY, status: 'DRAFT' }),
      submitDelivery: jest
        .fn()
        .mockResolvedValue({ id: VALID_DELIVERY, status: 'SUBMITTED' }),
      acceptDeliveryFromPortal: jest.fn(),
      requestChangesFromPortal: jest.fn(),
    };

    const result = await createDeliveriesHttpTestApp(serviceMock);
    app = result.app;
    httpRequest = result.request;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/milestones/:id/deliveries', () => {
    it('should return 201 for a valid request', async () => {
      const res = await httpRequest
        .post(`/api/v1/milestones/${VALID_MILESTONE}/deliveries`)
        .set('Authorization', TEST_AUTH_HEADER)
        .send({
          summary: 'Completed the homepage redesign with responsive nav.',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 without auth header', async () => {
      const res = await httpRequest
        .post(`/api/v1/milestones/${VALID_MILESTONE}/deliveries`)
        .send({ summary: 'Test.' });
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid body', async () => {
      const res = await httpRequest
        .post(`/api/v1/milestones/${VALID_MILESTONE}/deliveries`)
        .set('Authorization', TEST_AUTH_HEADER)
        .send({ summary: 'Short' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/deliveries', () => {
    it('should return 200 with paginated results', async () => {
      const res = await httpRequest
        .get('/api/v1/deliveries')
        .set('Authorization', TEST_AUTH_HEADER);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 without auth', async () => {
      const res = await httpRequest.get('/api/v1/deliveries');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/deliveries/:id', () => {
    it('should return 200 for a valid request', async () => {
      const res = await httpRequest
        .get(`/api/v1/deliveries/${VALID_DELIVERY}`)
        .set('Authorization', TEST_AUTH_HEADER);
      expect(res.status).toBe(200);
    });

    it('should return 401 without auth', async () => {
      const res = await httpRequest.get(`/api/v1/deliveries/${VALID_DELIVERY}`);
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/deliveries/:id', () => {
    it('should return 200 for a valid partial update', async () => {
      const res = await httpRequest
        .patch(`/api/v1/deliveries/${VALID_DELIVERY}`)
        .set('Authorization', TEST_AUTH_HEADER)
        .send({ summary: 'Updated assets and fixed mobile spacing.' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 without auth', async () => {
      const res = await httpRequest
        .patch(`/api/v1/deliveries/${VALID_DELIVERY}`)
        .send({ summary: 'Test.' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/deliveries/:id/submit', () => {
    it('should return 201 for a valid submit', async () => {
      const res = await httpRequest
        .post(`/api/v1/deliveries/${VALID_DELIVERY}/submit`)
        .set('Authorization', TEST_AUTH_HEADER)
        .send({});
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 without auth', async () => {
      const res = await httpRequest
        .post(`/api/v1/deliveries/${VALID_DELIVERY}/submit`)
        .send({});
      expect(res.status).toBe(401);
    });
  });
});
