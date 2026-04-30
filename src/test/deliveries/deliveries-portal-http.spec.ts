import { INestApplication } from '@nestjs/common';
import {
  createDeliveriesHttpTestApp,
  TEST_PORTAL_TOKEN,
  TEST_DELIVERY_ID,
} from './deliveries-http-test-utils';

const VALID_DELIVERY = TEST_DELIVERY_ID;

describe('Deliveries Portal HTTP', () => {
  let app: INestApplication;
  let serviceMock: Record<string, jest.Mock>;
  let httpRequest: ReturnType<typeof import('supertest')>;

  beforeAll(async () => {
    serviceMock = {
      createDelivery: jest.fn(),
      listDeliveries: jest.fn(),
      getDeliveryById: jest.fn(),
      updateDelivery: jest.fn(),
      submitDelivery: jest.fn(),
      acceptDeliveryFromPortal: jest
        .fn()
        .mockResolvedValue({ id: VALID_DELIVERY, status: 'ACCEPTED' }),
      requestChangesFromPortal: jest
        .fn()
        .mockResolvedValue({ id: VALID_DELIVERY, status: 'CHANGES_REQUESTED' }),
    };

    const result = await createDeliveriesHttpTestApp(serviceMock);
    app = result.app;
    httpRequest = result.request;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/portal/:token/deliveries/:id/accept', () => {
    it('should return 201 with a valid portal token', async () => {
      const res = await httpRequest
        .post(
          `/api/v1/portal/${TEST_PORTAL_TOKEN}/deliveries/${VALID_DELIVERY}/accept`,
        )
        .send({});
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(serviceMock.acceptDeliveryFromPortal).toHaveBeenCalledWith(
        TEST_PORTAL_TOKEN,
        VALID_DELIVERY,
        expect.objectContaining({ note: undefined }),
      );
    });

    it('should return 401 with an invalid portal token', async () => {
      const res = await httpRequest
        .post(
          `/api/v1/portal/invalid-token/deliveries/${VALID_DELIVERY}/accept`,
        )
        .send({});
      expect(res.status).toBe(401);
    });

    it('should return 401 with an expired portal token', async () => {
      const res = await httpRequest
        .post(
          `/api/v1/portal/expired-token/deliveries/${VALID_DELIVERY}/accept`,
        )
        .send({});
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/portal/:token/deliveries/:id/request-changes', () => {
    const payload = {
      reason:
        'The mobile navigation still overlaps the header and needs adjustment.',
    };

    it('should return 201 with a valid portal token and required reason', async () => {
      const res = await httpRequest
        .post(
          `/api/v1/portal/${TEST_PORTAL_TOKEN}/deliveries/${VALID_DELIVERY}/request-changes`,
        )
        .send(payload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(serviceMock.requestChangesFromPortal).toHaveBeenCalledWith(
        TEST_PORTAL_TOKEN,
        VALID_DELIVERY,
        payload,
      );
    });

    it('should return 400 when reason is missing', async () => {
      const res = await httpRequest
        .post(
          `/api/v1/portal/${TEST_PORTAL_TOKEN}/deliveries/${VALID_DELIVERY}/request-changes`,
        )
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 401 with an invalid portal token', async () => {
      const res = await httpRequest
        .post(
          `/api/v1/portal/invalid-token/deliveries/${VALID_DELIVERY}/request-changes`,
        )
        .send(payload);
      expect(res.status).toBe(401);
    });
  });
});
