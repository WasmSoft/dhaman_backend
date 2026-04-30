import { INestApplication } from '@nestjs/common';
import {
  createDeliveriesHttpTestApp,
  TEST_AUTH_HEADER,
  TEST_PORTAL_TOKEN,
  TEST_DELIVERY_ID,
} from './deliveries-http-test-utils';

const VALID_DELIVERY = TEST_DELIVERY_ID;

describe('Deliveries Response Envelope HTTP', () => {
  let app: INestApplication;
  let serviceMock: Record<string, jest.Mock>;
  let httpRequest: ReturnType<typeof import('supertest')>;

  beforeAll(async () => {
    serviceMock = {
      createDelivery: jest.fn().mockResolvedValue({ id: VALID_DELIVERY, status: 'DRAFT' }),
      listDeliveries: jest.fn().mockResolvedValue({ deliveries: [], total: 0, page: 1, limit: 20 }),
      getDeliveryById: jest.fn().mockResolvedValue({ id: VALID_DELIVERY, status: 'DRAFT' }),
      updateDelivery: jest.fn(),
      submitDelivery: jest.fn(),
      acceptDeliveryFromPortal: jest
        .fn()
        .mockResolvedValue({ id: VALID_DELIVERY, status: 'ACCEPTED' }),
      requestChangesFromPortal: jest.fn(),
    };

    const result = await createDeliveriesHttpTestApp(serviceMock);
    app = result.app;
    httpRequest = result.request;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('success envelope', () => {
    it('should wrap a freelancer route response in the success envelope', async () => {
      const res = await httpRequest
        .get('/api/v1/deliveries')
        .set('Authorization', TEST_AUTH_HEADER);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('requestId');
    });

    it('should wrap a portal route response in the success envelope', async () => {
      const res = await httpRequest
        .post(`/api/v1/portal/${TEST_PORTAL_TOKEN}/deliveries/${VALID_DELIVERY}/accept`)
        .send({});
      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('error envelope', () => {
    it('should return a translated error envelope for unauthorized freelancer requests', async () => {
      const res = await httpRequest.get('/api/v1/deliveries');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
      expect(res.body.error).toHaveProperty('requestId');
    });

    it('should return a translated error envelope for invalid portal token requests', async () => {
      const res = await httpRequest
        .post(`/api/v1/portal/invalid-token/deliveries/${VALID_DELIVERY}/accept`)
        .send({});
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
    });
  });
});
