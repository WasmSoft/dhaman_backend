import { INestApplication } from '@nestjs/common';
import {
  closeSettingsHttpTestApp,
  createSettingsHttpTestApp,
  TEST_AUTH_HEADER,
} from './settings-http-test-utils';

describe('Settings HTTP', () => {
  let app: INestApplication;
  let serviceMock: Record<string, jest.Mock>;
  let httpRequest: ReturnType<typeof import('supertest')>;

  beforeAll(async () => {
    serviceMock = {
      getSettings: jest.fn().mockResolvedValue({
        id: 'settings-1',
        userId: 'settings-user-1',
        defaultCurrency: 'USD',
        defaultServiceType: 'Logo Design',
        defaultDelayPolicy: null,
        defaultCancellationPolicy: null,
        defaultExtraRequestPolicy: null,
        defaultReviewPolicy: null,
        aiStrictness: 'balanced',
        emailNotificationsEnabled: true,
        createdAt: '2026-04-30T10:00:00.000Z',
        updatedAt: '2026-04-30T10:15:00.000Z',
      }),
      updateSettings: jest.fn().mockResolvedValue({
        id: 'settings-1',
        userId: 'settings-user-1',
        defaultCurrency: 'EUR',
        defaultServiceType: 'Logo Design',
        defaultDelayPolicy: null,
        defaultCancellationPolicy: null,
        defaultExtraRequestPolicy: null,
        defaultReviewPolicy: null,
        aiStrictness: 'balanced',
        emailNotificationsEnabled: false,
        createdAt: '2026-04-30T10:00:00.000Z',
        updatedAt: '2026-04-30T10:20:00.000Z',
      }),
      getDefaultPolicies: jest.fn().mockResolvedValue({
        defaultDelayPolicy: null,
        defaultCancellationPolicy: null,
        defaultExtraRequestPolicy: null,
        defaultReviewPolicy: 'Review policy',
      }),
      updateDefaultPolicies: jest.fn().mockResolvedValue({
        defaultDelayPolicy: null,
        defaultCancellationPolicy: null,
        defaultExtraRequestPolicy: null,
        defaultReviewPolicy: 'Updated review policy',
      }),
    };

    const result = await createSettingsHttpTestApp(serviceMock);
    app = result.app;
    httpRequest = result.request;
  });

  afterAll(async () => {
    await closeSettingsHttpTestApp(app);
  });

  it('requires JWT for GET /api/v1/settings', async () => {
    const res = await httpRequest.get('/api/v1/settings');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns the settings success envelope for GET /api/v1/settings', async () => {
    const res = await httpRequest
      .get('/api/v1/settings')
      .set('Authorization', TEST_AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.defaultCurrency).toBe('USD');
    expect(serviceMock.getSettings).toHaveBeenCalledTimes(1);
  });

  it('validates PATCH /api/v1/settings before calling the service', async () => {
    const res = await httpRequest
      .patch('/api/v1/settings')
      .set('Authorization', TEST_AUTH_HEADER)
      .send({ defaultCurrency: 'usd' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(serviceMock.updateSettings).not.toHaveBeenCalled();
  });

  it('updates general settings through PATCH /api/v1/settings', async () => {
    const payload = {
      defaultCurrency: 'EUR',
      emailNotificationsEnabled: false,
    };

    const res = await httpRequest
      .patch('/api/v1/settings')
      .set('Authorization', TEST_AUTH_HEADER)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.defaultCurrency).toBe('EUR');
    expect(serviceMock.updateSettings).toHaveBeenCalledWith(payload);
  });

  it('returns default policies through GET /api/v1/settings/default-policies', async () => {
    const res = await httpRequest
      .get('/api/v1/settings/default-policies')
      .set('Authorization', TEST_AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.defaultReviewPolicy).toBe('Review policy');
    expect(serviceMock.getDefaultPolicies).toHaveBeenCalledTimes(1);
  });

  it('updates default policies through PATCH /api/v1/settings/default-policies', async () => {
    const payload = {
      defaultReviewPolicy: 'Updated review policy',
    };

    const res = await httpRequest
      .patch('/api/v1/settings/default-policies')
      .set('Authorization', TEST_AUTH_HEADER)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.defaultReviewPolicy).toBe('Updated review policy');
    expect(serviceMock.updateDefaultPolicies).toHaveBeenCalledWith(payload);
  });
});
