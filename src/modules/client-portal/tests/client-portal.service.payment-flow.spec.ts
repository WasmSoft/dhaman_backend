import { Test, TestingModule } from '@nestjs/testing';
import { AgreementStatus } from '@prisma/client';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { ClientPortalService } from '../client-portal.service';
import {
  buildPrismaMock,
  buildPaymentsServiceMock,
  buildDeliveriesServiceMock,
  buildTimelineServiceMock,
  buildEmailServiceMock,
  buildClsServiceMock,
  makeMockAgreement,
  assertTimelineEventExists,
} from './client-portal.service.test-utils';

describe('ClientPortalService — payment flow (US3)', () => {
  let service: ClientPortalService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let paymentsMock: ReturnType<typeof buildPaymentsServiceMock>;
  let timelineMock: ReturnType<typeof buildTimelineServiceMock>;
  let emailMock: ReturnType<typeof buildEmailServiceMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  beforeEach(async () => {
    prismaMock = buildPrismaMock();
    paymentsMock = buildPaymentsServiceMock();
    const deliveriesMock = buildDeliveriesServiceMock();
    timelineMock = buildTimelineServiceMock();
    emailMock = buildEmailServiceMock();
    clsMock = buildClsServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPortalService,
        {
          provide: require('../../../infrastructure/prisma/prisma.service')
            .PrismaService,
          useValue: prismaMock,
        },
        {
          provide: require('../../../common/cls/cls.service').ClsService,
          useValue: clsMock,
        },
        {
          provide: require('../../payments/payments.service').PaymentsService,
          useValue: paymentsMock,
        },
        {
          provide: require('../../deliveries/deliveries.service')
            .DeliveriesService,
          useValue: deliveriesMock,
        },
        {
          provide: require('../../timeline-events/timeline-events.service')
            .TimelineEventsService,
          useValue: timelineMock,
        },
        {
          provide:
            require('../../email-notifications/email-notifications.service')
              .EmailNotificationsService,
          useValue: emailMock,
        },
      ],
    }).compile();

    service = module.get<ClientPortalService>(ClientPortalService);
  });

  // ──────────────────────────────────────────────
  //  Payment funding flow
  // ──────────────────────────────────────────────

  describe('fundPayment flow', () => {
    it('should delegate funding to PaymentsService.portalFund', async () => {
      paymentsMock.portalFund.mockResolvedValue({
        id: 'p1',
        status: 'RESERVED',
        receiptNumber: 'REC-001',
      });

      const result = await service.fundPayment('any-token', 'p1', {
        amount: '2500.00',
      });

      expect(paymentsMock.portalFund).toHaveBeenCalledWith('any-token', 'p1', {
        amount: '2500.00',
      });
      expect(result.status).toBe('RESERVED');
    });

    it('should propagate PAYMENT_NOT_FUNDABLE from PaymentsService', async () => {
      paymentsMock.portalFund.mockRejectedValue(
        new (require('../../../common/errors/app-exception').AppException)({
          code: ErrorCode.PAYMENT_NOT_FUNDABLE,
        }),
      );

      await expect(
        service.fundPayment('any-token', 'p1', { amount: '2500.00' }),
      ).rejects.toMatchObject({
        code: ErrorCode.PAYMENT_NOT_FUNDABLE,
      });
    });

    it('should propagate PAYMENT_NOT_FOUND from PaymentsService', async () => {
      paymentsMock.portalFund.mockRejectedValue(
        new (require('../../../common/errors/app-exception').AppException)({
          code: ErrorCode.PAYMENT_NOT_FOUND,
        }),
      );

      await expect(
        service.fundPayment('any-token', 'p1', { amount: '2500.00' }),
      ).rejects.toMatchObject({
        code: ErrorCode.PAYMENT_NOT_FOUND,
      });
    });

    it('should verify CLS context before delegating funding', async () => {
      clsMock.getContext.mockReturnValue({});

      await expect(
        service.fundPayment('any-token', 'p1', { amount: '2500.00' }),
      ).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_INVALID,
      });

      // PaymentsService should not be called when context is invalid
      expect(paymentsMock.portalFund).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  //  Payment release flow
  // ──────────────────────────────────────────────

  describe('releasePayment flow', () => {
    it('should delegate release to PaymentsService.portalReleaseConfirmation', async () => {
      paymentsMock.portalReleaseConfirmation.mockResolvedValue({
        id: 'p1',
        status: 'RELEASED',
      });

      const result = await service.releasePayment('any-token', 'p1', {
        confirmed: true,
        notes: 'Approved by client.',
      });

      expect(paymentsMock.portalReleaseConfirmation).toHaveBeenCalledWith(
        'any-token',
        'p1',
        { confirmed: true, notes: 'Approved by client.' },
      );
      expect(result.status).toBe('RELEASED');
    });

    it('should propagate error from PaymentsService on release', async () => {
      paymentsMock.portalReleaseConfirmation.mockRejectedValue(
        new (require('../../../common/errors/app-exception').AppException)({
          code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE,
        }),
      );

      await expect(
        service.releasePayment('any-token', 'p1', { confirmed: true }),
      ).rejects.toMatchObject({
        code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE,
      });
    });

    it('should verify CLS context before delegating release', async () => {
      clsMock.getContext.mockReturnValue({});

      await expect(
        service.releasePayment('any-token', 'p1', { confirmed: true }),
      ).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_INVALID,
      });

      expect(paymentsMock.portalReleaseConfirmation).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  //  Payment listing scoped to agreement
  // ──────────────────────────────────────────────

  describe('getPayments scoping', () => {
    it('should return only payments for the token agreement', async () => {
      prismaMock.payment.findMany.mockResolvedValue([
        {
          id: 'p1',
          milestoneId: 'm1',
          amount: '2500.00',
          currency: 'SAR',
          status: 'WAITING',
          demoMode: true,
          reservedAt: null,
          releasedAt: null,
          createdAt: new Date('2026-01-01'),
        },
      ]);
      prismaMock.milestone.findMany.mockResolvedValue([
        { id: 'm1', title: 'Logo Design' },
      ]);

      const result = await service.getPayments('any-token');

      expect(result.agreementId).toBe('agreement-1');
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].milestoneTitle).toBe('Logo Design');
    });

    it('should return empty payments array for agreement with no payments', async () => {
      prismaMock.payment.findMany.mockResolvedValue([]);
      prismaMock.milestone.findMany.mockResolvedValue([]);

      const result = await service.getPayments('any-token');

      expect(result.payments).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  //  Payment history scoped to agreement
  // ──────────────────────────────────────────────

  describe('getPaymentHistory scoping', () => {
    it('should return payment history for token agreement', async () => {
      prismaMock.payment.findMany.mockResolvedValue([
        {
          id: 'p1',
          milestoneId: 'm1',
          amount: '2500.00',
          currency: 'SAR',
          status: 'RELEASED',
          demoMode: true,
          reservedAt: new Date('2026-01-15'),
          releasedAt: new Date('2026-02-01'),
          createdAt: new Date('2026-01-01'),
        },
      ]);
      prismaMock.milestone.findMany.mockResolvedValue([
        { id: 'm1', title: 'Logo Design' },
      ]);

      const result = await service.getPaymentHistory('any-token');

      expect(result.agreementId).toBe('agreement-1');
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].status).toBe('RELEASED');
      expect(result.payments[0].fundedAt).toBeDefined();
      expect(result.payments[0].releasedAt).toBeDefined();
    });
  });
});
