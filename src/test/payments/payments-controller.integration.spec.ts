import { AppException } from '../../common/errors/app-exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import {
  closeHttpTestApp,
  createPaymentsHttpTestApp,
  TEST_AGREEMENT_ID,
  TEST_MILESTONE_ID,
  TEST_PAYMENT_ID,
  TEST_REQUEST_ID,
  TEST_USER_ID,
} from './payments-http-test-utils';

function makePaymentResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_PAYMENT_ID,
    agreementId: TEST_AGREEMENT_ID,
    amount: '1500.00',
    createdAt: '2026-04-29T00:00:00.000Z',
    currency: 'SAR',
    demoMode: true,
    milestoneId: TEST_MILESTONE_ID,
    operationType: 'FUND_MILESTONE',
    status: 'WAITING',
    updatedAt: '2026-04-29T00:00:00.000Z',
    ...overrides,
  };
}

function makeReceiptResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'DHM-20260429-ABC123',
    paymentId: TEST_PAYMENT_ID,
    receiptNumber: 'DHM-20260429-ABC123',
    transactionReference: 'TXN-abcdefghijklmnopqrstuvwx',
    amount: '1500.00',
    currency: 'SAR',
    status: 'RESERVED',
    operationType: 'FUND_MILESTONE',
    agreementId: TEST_AGREEMENT_ID,
    demoMode: true,
    reservedAt: '2026-04-29T00:00:00.000Z',
    createdAt: '2026-04-29T00:00:00.000Z',
    issuedAt: '2026-04-29T00:00:00.000Z',
    ...overrides,
  };
}

describe('PaymentsController HTTP integration', () => {
  it('returns 200 for GET /agreements/:agreementId/payments and forwards the authenticated user', async () => {
    const paymentsService = {
      listByAgreementId: jest.fn().mockResolvedValue({
        payments: [makePaymentResponse()],
        totalFunded: '1500.00',
        totalReleased: '0.00',
        totalPending: '1500.00',
        currency: 'SAR',
      }),
    };
    const { app, authHeader, request } =
      await createPaymentsHttpTestApp(paymentsService);

    try {
      const response = await request
        .get(`/api/v1/agreements/${TEST_AGREEMENT_ID}/payments`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(paymentsService.listByAgreementId).toHaveBeenCalledWith(
        TEST_AGREEMENT_ID,
        TEST_USER_ID,
      );
      expect(response.body.success).toBe(true);
      expect(response.body.meta.requestId).toBe(TEST_REQUEST_ID);
      expect(response.body.data.totalFunded).toBe('1500.00');
      expect(response.body.data.payments[0]).toMatchObject({
        id: TEST_PAYMENT_ID,
        agreementId: TEST_AGREEMENT_ID,
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 201 for POST /payments/fund-milestone', async () => {
    const paymentsService = {
      fundMilestone: jest.fn().mockResolvedValue(
        makePaymentResponse({
          paymentMethodLabel: 'Demo Bank Transfer',
          receiptNumber: 'DHM-20260429-ABC123',
          reservedAt: '2026-04-29T00:00:00.000Z',
          status: 'RESERVED',
          transactionReference: 'TXN-abcdefghijklmnopqrstuvwx',
        }),
      ),
    };
    const { app, authHeader, request } =
      await createPaymentsHttpTestApp(paymentsService);
    const payload = { milestoneId: TEST_MILESTONE_ID, amount: '1500.00' };

    try {
      const response = await request
        .post('/api/v1/payments/fund-milestone')
        .set('Authorization', authHeader)
        .send(payload)
        .expect(201);

      expect(paymentsService.fundMilestone).toHaveBeenCalledWith(
        payload,
        TEST_USER_ID,
      );
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        status: 'RESERVED',
        receiptNumber: 'DHM-20260429-ABC123',
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('maps PAYMENT_ALREADY_RESERVED to 409 for POST /payments/fund-milestone', async () => {
    const paymentsService = {
      fundMilestone: jest
        .fn()
        .mockRejectedValue(new AppException({ code: ErrorCode.PAYMENT_ALREADY_RESERVED })),
    };
    const { app, authHeader, request } =
      await createPaymentsHttpTestApp(paymentsService);

    try {
      const response = await request
        .post('/api/v1/payments/fund-milestone')
        .set('Authorization', authHeader)
        .send({ milestoneId: TEST_MILESTONE_ID, amount: '1500.00' })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: { code: ErrorCode.PAYMENT_ALREADY_RESERVED },
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 200 for POST /payments/release', async () => {
    const paymentsService = {
      release: jest.fn().mockResolvedValue(
        makePaymentResponse({
          releasedAt: '2026-04-29T01:00:00.000Z',
          status: 'RELEASED',
        }),
      ),
    };
    const { app, authHeader, request } =
      await createPaymentsHttpTestApp(paymentsService);
    const payload = { paymentId: TEST_PAYMENT_ID, notes: 'Client approved' };

    try {
      const response = await request
        .post('/api/v1/payments/release')
        .set('Authorization', authHeader)
        .send(payload)
        .expect(200);

      expect(paymentsService.release).toHaveBeenCalledWith(payload, TEST_USER_ID);
      expect(response.body.data).toMatchObject({
        status: 'RELEASED',
        releasedAt: '2026-04-29T01:00:00.000Z',
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('maps PAYMENT_NOT_READY_TO_RELEASE to 409 for POST /payments/release', async () => {
    const paymentsService = {
      release: jest
        .fn()
        .mockRejectedValue(new AppException({ code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE })),
    };
    const { app, authHeader, request } =
      await createPaymentsHttpTestApp(paymentsService);

    try {
      const response = await request
        .post('/api/v1/payments/release')
        .set('Authorization', authHeader)
        .send({ paymentId: TEST_PAYMENT_ID })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: { code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE },
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 200 for GET /payments/:id', async () => {
    const paymentsService = {
      getById: jest.fn().mockResolvedValue(makePaymentResponse()),
    };
    const { app, authHeader, request } =
      await createPaymentsHttpTestApp(paymentsService);

    try {
      const response = await request
        .get(`/api/v1/payments/${TEST_PAYMENT_ID}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(paymentsService.getById).toHaveBeenCalledWith(
        TEST_PAYMENT_ID,
        TEST_USER_ID,
      );
      expect(response.body.data).toMatchObject({
        id: TEST_PAYMENT_ID,
        agreementId: TEST_AGREEMENT_ID,
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 200 for GET /payments/:id/receipt', async () => {
    const paymentsService = {
      getReceipt: jest.fn().mockResolvedValue(
        makeReceiptResponse({ milestoneTitle: 'Initial Deposit' }),
      ),
    };
    const { app, authHeader, request } =
      await createPaymentsHttpTestApp(paymentsService);

    try {
      const response = await request
        .get(`/api/v1/payments/${TEST_PAYMENT_ID}/receipt`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(paymentsService.getReceipt).toHaveBeenCalledWith(
        TEST_PAYMENT_ID,
        TEST_USER_ID,
      );
      expect(response.body.data).toMatchObject({
        paymentId: TEST_PAYMENT_ID,
        receiptNumber: 'DHM-20260429-ABC123',
        milestoneTitle: 'Initial Deposit',
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 201 for POST /portal/:token/payments/:paymentId/fund with a valid portal token', async () => {
    const paymentsService = {
      portalFund: jest.fn().mockResolvedValue(
        makePaymentResponse({
          receiptNumber: 'DHM-20260429-PORTAL1',
          reservedAt: '2026-04-29T00:00:00.000Z',
          status: 'RESERVED',
          transactionReference: 'TXN-portalabcdefghijklmnop',
        }),
      ),
    };
    const { app, request } = await createPaymentsHttpTestApp(paymentsService);
    const payload = { amount: '1500.00', paymentMethodLabel: 'Demo Bank Transfer' };

    try {
      const response = await request
        .post(`/api/v1/portal/payment-token/payments/${TEST_PAYMENT_ID}/fund`)
        .send(payload)
        .expect(201);

      expect(paymentsService.portalFund).toHaveBeenCalledWith(
        'payment-token',
        TEST_PAYMENT_ID,
        payload,
      );
      expect(response.body.data).toMatchObject({
        status: 'RESERVED',
        receiptNumber: 'DHM-20260429-PORTAL1',
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 401 for POST /portal/:token/payments/:paymentId/fund with an invalid portal token', async () => {
    const paymentsService = {
      portalFund: jest.fn(),
    };
    const { app, request } = await createPaymentsHttpTestApp(paymentsService);

    try {
      const response = await request
        .post(`/api/v1/portal/invalid-token/payments/${TEST_PAYMENT_ID}/fund`)
        .send({ amount: '1500.00' })
        .expect(401);

      expect(paymentsService.portalFund).not.toHaveBeenCalled();
      expect(response.body).toMatchObject({
        success: false,
        error: { code: ErrorCode.PORTAL_TOKEN_INVALID },
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 200 for POST /portal/:token/payments/:paymentId/release-confirmation', async () => {
    const paymentsService = {
      portalReleaseConfirmation: jest.fn().mockResolvedValue(
        makePaymentResponse({
          releasedAt: '2026-04-29T01:00:00.000Z',
          status: 'RELEASED',
        }),
      ),
    };
    const { app, request } = await createPaymentsHttpTestApp(paymentsService);
    const payload = { confirmed: true, notes: 'Approved in portal' };

    try {
      const response = await request
        .post(
          `/api/v1/portal/release-token/payments/${TEST_PAYMENT_ID}/release-confirmation`,
        )
        .send(payload)
        .expect(200);

      expect(paymentsService.portalReleaseConfirmation).toHaveBeenCalledWith(
        'release-token',
        TEST_PAYMENT_ID,
        payload,
      );
      expect(response.body.data).toMatchObject({
        status: 'RELEASED',
        releasedAt: '2026-04-29T01:00:00.000Z',
      });
    } finally {
      await closeHttpTestApp(app);
    }
  });

  it('returns 401 for all JWT payment endpoints when the bearer token is missing', async () => {
    const paymentsService = {
      fundMilestone: jest.fn(),
      getById: jest.fn(),
      getReceipt: jest.fn(),
      listByAgreementId: jest.fn(),
      release: jest.fn(),
    };
    const { app, request } = await createPaymentsHttpTestApp(paymentsService);

    try {
      const responses = await Promise.all([
        request.get(`/api/v1/agreements/${TEST_AGREEMENT_ID}/payments`),
        request.post('/api/v1/payments/fund-milestone').send({
          milestoneId: TEST_MILESTONE_ID,
          amount: '1500.00',
        }),
        request.post('/api/v1/payments/release').send({ paymentId: TEST_PAYMENT_ID }),
        request.get(`/api/v1/payments/${TEST_PAYMENT_ID}`),
        request.get(`/api/v1/payments/${TEST_PAYMENT_ID}/receipt`),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          success: false,
          error: { code: ErrorCode.UNAUTHORIZED },
        });
      }

      expect(paymentsService.listByAgreementId).not.toHaveBeenCalled();
      expect(paymentsService.fundMilestone).not.toHaveBeenCalled();
      expect(paymentsService.release).not.toHaveBeenCalled();
      expect(paymentsService.getById).not.toHaveBeenCalled();
      expect(paymentsService.getReceipt).not.toHaveBeenCalled();
    } finally {
      await closeHttpTestApp(app);
    }
  });
});
