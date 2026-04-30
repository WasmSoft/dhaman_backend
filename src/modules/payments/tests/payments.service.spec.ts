import {
  AgreementStatus,
  MilestoneStatus,
  PaymentStatus,
  TimelineActorRole,
  TimelineEventType,
} from '@prisma/client';
import { PaymentsService } from '../payments.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from '../../../common/cls/cls.service';
import {
  PaymentOperationType,
} from '@prisma/client';

function makeMockPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment-1',
    agreementId: 'agreement-1',
    milestoneId: 'milestone-1',
    changeRequestId: null,
    amount: '1000.00',
    currency: 'SAR',
    status: PaymentStatus.WAITING,
    operationType: PaymentOperationType.FUND_MILESTONE,
    paymentMethodLabel: null,
    receiptNumber: null,
    transactionReference: null,
    demoMode: true,
    reservedAt: null,
    releasedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    agreement: { freelancerId: 'freelancer-1', currency: 'SAR' },
    milestone: { title: 'Test Milestone', status: MilestoneStatus.ACTIVE },
    ...overrides,
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let module: TestingModule;
  let mockPrisma: {
    payment: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    milestone: { update: jest.Mock };
    agreement: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let mockTimeline: { createEvent: jest.Mock };
  let clsServiceMock: { getContext: jest.Mock; setContext: jest.Mock };

  beforeEach(async () => {
    mockPrisma = {
      payment: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      milestone: { update: jest.fn() },
      agreement: { findUnique: jest.fn() },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    mockTimeline = {
      createEvent: jest.fn().mockResolvedValue({ id: 'timeline-1' }),
    };

    clsServiceMock = { getContext: jest.fn(), setContext: jest.fn() };

    module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TimelineEventsService, useValue: mockTimeline },
        { provide: ClsService, useValue: clsServiceMock },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('validateTransition', () => {
    const validTransitions: Array<[PaymentStatus, PaymentStatus]> = [
      [PaymentStatus.WAITING, PaymentStatus.RESERVED],
      [PaymentStatus.RESERVED, PaymentStatus.CLIENT_REVIEW],
      [PaymentStatus.CLIENT_REVIEW, PaymentStatus.READY_TO_RELEASE],
      [PaymentStatus.CLIENT_REVIEW, PaymentStatus.AI_REVIEW],
      [PaymentStatus.CLIENT_REVIEW, PaymentStatus.ON_HOLD],
      [PaymentStatus.AI_REVIEW, PaymentStatus.READY_TO_RELEASE],
      [PaymentStatus.AI_REVIEW, PaymentStatus.ON_HOLD],
      [PaymentStatus.READY_TO_RELEASE, PaymentStatus.RELEASED],
      [PaymentStatus.ON_HOLD, PaymentStatus.CLIENT_REVIEW],
    ];

    it.each(validTransitions)('should allow %s -> %s', (current, target) => {
      expect((service as any).validateTransition(current, target)).toBe(true);
    });

    it('should reject self-transitions', () => {
      expect(() =>
        (service as any).validateTransition(PaymentStatus.WAITING, PaymentStatus.WAITING),
      ).toThrow();
    });

    it('should reject terminal RELEASED transitions', () => {
      expect(() =>
        (service as any).validateTransition(PaymentStatus.RELEASED, PaymentStatus.CLIENT_REVIEW),
      ).toThrow();
    });

    it('should throw PAYMENT_INVALID_TRANSITION error code', () => {
      try {
        (service as any).validateTransition(PaymentStatus.WAITING, PaymentStatus.RELEASED);
      } catch (e: any) {
        expect(e.code).toBe(ErrorCode.PAYMENT_INVALID_TRANSITION);
      }
    });
  });

  // ============================================================
  // fundMilestone tests
  // ============================================================

  describe('fundMilestone', () => {
    const waitingPayment = makeMockPayment();

    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.payment.findFirst.mockResolvedValue(waitingPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...waitingPayment,
        status: PaymentStatus.RESERVED,
        receiptNumber: 'DHM-20260429-ABC123',
        transactionReference: 'TXN-abcdefghijklmnopqrstuvwx',
        reservedAt: new Date(),
        paymentMethodLabel: 'Demo Bank Transfer',
      });
      mockPrisma.milestone.update.mockResolvedValue({});
    });

    it('should fund a waiting payment successfully', async () => {
      const result = await service.fundMilestone(
        { milestoneId: 'milestone-1', amount: '1000.00' },
        'user-1',
      );
      expect(result.status).toBe(PaymentStatus.RESERVED);
      expect(result.receiptNumber).toMatch(/^DHM-\d{8}-[A-Z0-9]{6}$/);
    });

    it('should reject when payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      await expect(
        service.fundMilestone({ milestoneId: 'milestone-1', amount: '1000.00' }),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });

    it('should reject when already reserved', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.RESERVED }),
      );
      await expect(
        service.fundMilestone({ milestoneId: 'milestone-1', amount: '1000.00' }),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_ALREADY_RESERVED });
    });

    it('should reject when amount does not match', async () => {
      await expect(
        service.fundMilestone({ milestoneId: 'milestone-1', amount: '500.00' }),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_AMOUNT });
    });

    it('should sync milestone paymentStatus to RESERVED', async () => {
      await service.fundMilestone({ milestoneId: 'milestone-1', amount: '1000.00' }, 'user-1');
      expect(mockPrisma.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { paymentStatus: PaymentStatus.RESERVED },
        }),
      );
    });

    it('should create PAYMENT_RESERVED timeline event', async () => {
      await service.fundMilestone({ milestoneId: 'milestone-1', amount: '1000.00' }, 'user-1');
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Payment Reserved' }),
        mockPrisma,
      );
    });

    it('should include complete metadata in PAYMENT_RESERVED timeline event', async () => {
      await service.fundMilestone(
        { milestoneId: 'milestone-1', amount: '1000.00', paymentMethodLabel: 'Bank Transfer' },
        'user-1',
      );
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-1',
          actorRole: 'FREELANCER',
          agreementId: 'agreement-1',
          milestoneId: 'milestone-1',
          type: 'PAYMENT_RESERVED',
          metadata: expect.objectContaining({
            paymentId: 'payment-1',
            previousStatus: PaymentStatus.WAITING,
            newStatus: PaymentStatus.RESERVED,
            receiptNumber: expect.any(String),
            transactionReference: expect.any(String),
          }),
        }),
        mockPrisma,
      );
    });

    it('should default paymentMethodLabel to Demo Bank Transfer', async () => {
      await service.fundMilestone({ milestoneId: 'milestone-1', amount: '1000.00' }, 'user-1');
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paymentMethodLabel: 'Demo Bank Transfer' }),
        }),
      );
    });

    it('should set reservedAt timestamp during funding', async () => {
      const result = await service.fundMilestone(
        { milestoneId: 'milestone-1', amount: '1000.00' },
        'user-1',
      );
      expect(result.reservedAt).toBeDefined();
      expect(typeof result.reservedAt).toBe('string');
    });
  });

  // ============================================================
  // releasePayment tests
  // ============================================================

  describe('releasePayment', () => {
    const readyPayment = makeMockPayment({ status: PaymentStatus.READY_TO_RELEASE });

    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.payment.findUnique.mockResolvedValue(readyPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...readyPayment,
        status: PaymentStatus.RELEASED,
        releasedAt: new Date(),
      });
      mockPrisma.milestone.update.mockResolvedValue({});
    });

    it('should release a ready payment successfully', async () => {
      const result = await service.releasePayment(
        { paymentId: 'payment-1' },
        'user-1',
      );
      expect(result.status).toBe(PaymentStatus.RELEASED);
    });

    it('should create PAYMENT_RELEASED timeline event with complete metadata', async () => {
      await service.releasePayment(
        { paymentId: 'payment-1', notes: 'Client approved' },
        'user-1',
      );
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-1',
          actorRole: 'FREELANCER',
          agreementId: 'agreement-1',
          milestoneId: 'milestone-1',
          type: 'PAYMENT_RELEASED',
          metadata: expect.objectContaining({
            paymentId: 'payment-1',
            previousStatus: PaymentStatus.READY_TO_RELEASE,
            newStatus: PaymentStatus.RELEASED,
            releasedAt: expect.any(String),
            notes: 'Client approved',
          }),
        }),
        mockPrisma,
      );
    });

    it('should release a ready payment and verify response', async () => {
      const result = await service.releasePayment(
        { paymentId: 'payment-1' },
        'user-1',
      );
      expect(result.status).toBe(PaymentStatus.RELEASED);
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Payment Released' }),
        mockPrisma,
      );
    });

    it('should reject when payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.releasePayment({ paymentId: 'nonexistent' }),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });

    it('should reject when already released', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.RELEASED }),
      );
      await expect(
        service.releasePayment({ paymentId: 'payment-1' }),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_ALREADY_RELEASED });
    });

    it('should reject when not ready to release', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.WAITING }),
      );
      await expect(
        service.releasePayment({ paymentId: 'payment-1' }),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE });
    });

    it('should mark milestone as ACCEPTED when releasing', async () => {
      await service.releasePayment({ paymentId: 'payment-1' }, 'user-1');
      expect(mockPrisma.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentStatus: PaymentStatus.RELEASED,
            status: MilestoneStatus.ACCEPTED,
          }),
        }),
      );
    });

    it('should include notes in timeline metadata when provided', async () => {
      await service.releasePayment(
        { paymentId: 'payment-1', notes: 'Client approved' },
        'user-1',
      );
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ notes: 'Client approved' }),
        }),
        mockPrisma,
      );
    });

    it('should NOT generate new receipt/reference during release', async () => {
      const result = await service.releasePayment({ paymentId: 'payment-1' }, 'user-1');
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PaymentStatus.RELEASED,
            releasedAt: expect.any(Date),
          }),
        }),
      );
      // Verify update does NOT include receiptNumber or transactionReference
      const updateCall = mockPrisma.payment.update.mock.calls[0][0];
      expect(updateCall.data.receiptNumber).toBeUndefined();
      expect(updateCall.data.transactionReference).toBeUndefined();
    });

    it('should not override milestone status when already ACCEPTED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({
          status: PaymentStatus.READY_TO_RELEASE,
          milestone: { title: 'Test Milestone', status: MilestoneStatus.ACCEPTED },
        }),
      );
      await service.releasePayment({ paymentId: 'payment-1' }, 'user-1');
      expect(mockPrisma.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { paymentStatus: PaymentStatus.RELEASED },
        }),
      );
    });

    it('should set releasedAt ISO string in response', async () => {
      const result = await service.releasePayment({ paymentId: 'payment-1' }, 'user-1');
      expect(result.releasedAt).toBeDefined();
      expect(typeof result.releasedAt).toBe('string');
    });
  });

  // ============================================================
  // getPayment tests
  // ============================================================

  describe('getPayment', () => {
    const ownedPayment = makeMockPayment();

    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.payment.findUnique.mockResolvedValue(ownedPayment);
    });

    it('should return payment when user owns the agreement', async () => {
      const result = await service.getPayment('payment-1', 'freelancer-1');
      expect(result.id).toBe('payment-1');
    });

    it('should reject when user does not own the agreement', async () => {
      await expect(
        service.getPayment('payment-1', 'wrong-user'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });

    it('should reject when payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.getPayment('nonexistent', 'freelancer-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });

    it('should return payment with complete DTO shape', async () => {
      const result = await service.getPayment('payment-1', 'freelancer-1');
      expect(result.id).toBeDefined();
      expect(result.agreementId).toBeDefined();
      expect(result.amount).toBeDefined();
      expect(result.currency).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.operationType).toBeDefined();
      expect(result.demoMode).toBe(true);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  // ============================================================
  // getPaymentReceipt tests
  // ============================================================

  describe('getPaymentReceipt', () => {
    it('should return receipt for funded payment', async () => {
      const funded = makeMockPayment({
        status: PaymentStatus.RESERVED,
        receiptNumber: 'DHM-20260429-ABC123',
        transactionReference: 'TXN-abcdefghijklmnopqrstuvwx',
        reservedAt: new Date(),
      });
      mockPrisma.payment.findUnique.mockResolvedValue(funded);

      const result = await service.getPaymentReceipt('payment-1', 'freelancer-1');
      expect(result.receiptNumber).toBe('DHM-20260429-ABC123');
    });

    it('should reject for unfunded payment (no receipt)', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(makeMockPayment());
      await expect(
        service.getPaymentReceipt('payment-1', 'freelancer-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });

    it('should reject when user does not own the agreement', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(makeMockPayment());
      await expect(
        service.getPaymentReceipt('payment-1', 'wrong-user'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });

    it('should include milestoneTitle from linked milestone', async () => {
      const funded = makeMockPayment({
        status: PaymentStatus.RESERVED,
        receiptNumber: 'DHM-20260429-ABC123',
        transactionReference: 'TXN-abcdefghijklmnopqrstuvwx',
        reservedAt: new Date(),
      });
      mockPrisma.payment.findUnique.mockResolvedValue(funded);

      const result = await service.getPaymentReceipt('payment-1', 'freelancer-1');
      expect(result.milestoneTitle).toBe('Test Milestone');
    });

    it('should include all receipt DTO fields', async () => {
      const funded = makeMockPayment({
        status: PaymentStatus.RESERVED,
        receiptNumber: 'DHM-20260429-ABC123',
        transactionReference: 'TXN-abcdefghijklmnopqrstuvwx',
        reservedAt: new Date(),
      });
      mockPrisma.payment.findUnique.mockResolvedValue(funded);

      const result = await service.getPaymentReceipt('payment-1', 'freelancer-1');
      expect(result.paymentId).toBe('payment-1');
      expect(result.receiptNumber).toBeDefined();
      expect(result.transactionReference).toBeDefined();
      expect(result.amount).toBeDefined();
      expect(result.currency).toBe('SAR');
      expect(result.agreementId).toBe('agreement-1');
      expect(result.demoMode).toBe(true);
    });
  });

  // ============================================================
  // getAgreementPayments tests
  // ============================================================

  describe('getAgreementPayments', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.agreement.findUnique.mockResolvedValue({
        freelancerId: 'freelancer-1',
        currency: 'SAR',
      });
    });

    it('should return payment list with totals', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        makeMockPayment({ id: 'p1', status: PaymentStatus.WAITING }),
        makeMockPayment({
          id: 'p2',
          status: PaymentStatus.RESERVED,
          receiptNumber: 'DHM-20260429-ABC123',
          transactionReference: 'TXN-aaaa',
        }),
        makeMockPayment({
          id: 'p3',
          status: PaymentStatus.RELEASED,
          receiptNumber: 'DHM-20260429-DEF456',
          transactionReference: 'TXN-bbbb',
        }),
      ]);

      const result = await service.getAgreementPayments('agreement-1', 'freelancer-1');
      expect(result.payments).toHaveLength(3);
      expect(result.totalPending).toBe('1000.00');
      expect(result.totalFunded).toBe('2000.00');
      expect(result.totalReleased).toBe('1000.00');
      expect(result.currency).toBe('SAR');
    });

    it('should return empty list and zero totals for agreement with no payments', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      const result = await service.getAgreementPayments('agreement-1', 'freelancer-1');
      expect(result.payments).toHaveLength(0);
      expect(result.totalFunded).toBe('0.00');
      expect(result.totalReleased).toBe('0.00');
      expect(result.totalPending).toBe('0.00');
    });

    it('should reject when agreement is not owned by user', async () => {
      mockPrisma.agreement.findUnique.mockResolvedValue(null);
      await expect(
        service.getAgreementPayments('agreement-1', 'wrong-user'),
      ).rejects.toMatchObject({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    });

    it('should handle all-waiting payments', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        makeMockPayment({ id: 'p1', status: PaymentStatus.WAITING }),
        makeMockPayment({ id: 'p2', status: PaymentStatus.WAITING }),
        makeMockPayment({ id: 'p3', status: PaymentStatus.WAITING }),
      ]);

      const result = await service.getAgreementPayments('agreement-1', 'freelancer-1');
      expect(result.totalPending).toBe('3000.00');
      expect(result.totalFunded).toBe('0.00');
      expect(result.totalReleased).toBe('0.00');
    });

    it('should handle all-released payments', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        makeMockPayment({ id: 'p1', status: PaymentStatus.RELEASED, receiptNumber: 'DHM-A', transactionReference: 'TXN-A' }),
        makeMockPayment({ id: 'p2', status: PaymentStatus.RELEASED, receiptNumber: 'DHM-B', transactionReference: 'TXN-B' }),
      ]);

      const result = await service.getAgreementPayments('agreement-1', 'freelancer-1');
      expect(result.totalPending).toBe('0.00');
      expect(result.totalFunded).toBe('2000.00');
      expect(result.totalReleased).toBe('2000.00');
    });

    it('should count RESERVED as funded but not released', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        makeMockPayment({ id: 'p1', status: PaymentStatus.RESERVED, receiptNumber: 'DHM-A', transactionReference: 'TXN-A' }),
      ]);

      const result = await service.getAgreementPayments('agreement-1', 'freelancer-1');
      expect(result.totalFunded).toBe('1000.00');
      expect(result.totalReleased).toBe('0.00');
      expect(result.totalPending).toBe('0.00');
    });

    it('should exclude FAILED/REFUNDED/NOT_REQUIRED from funded totals', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        makeMockPayment({ id: 'p1', status: PaymentStatus.FAILED }),
        makeMockPayment({ id: 'p2', status: PaymentStatus.REFUNDED }),
        makeMockPayment({ id: 'p3', status: PaymentStatus.NOT_REQUIRED }),
      ]);

      const result = await service.getAgreementPayments('agreement-1', 'freelancer-1');
      expect(result.totalFunded).toBe('0.00');
      expect(result.totalReleased).toBe('0.00');
      expect(result.totalPending).toBe('0.00');
    });
  });

  // ============================================================
  // Phase 3: transitionToClientReview tests
  // ============================================================

  describe('transitionToClientReview', () => {
    const reservedPayment = makeMockPayment({ status: PaymentStatus.RESERVED });

    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.payment.findUnique.mockResolvedValue(reservedPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...reservedPayment,
        status: PaymentStatus.CLIENT_REVIEW,
      });
      mockPrisma.milestone.update.mockResolvedValue({});
    });

    it('should transition RESERVED -> CLIENT_REVIEW', async () => {
      const result = await service.transitionToClientReview('payment-1', 'user-1');
      expect(result.status).toBe(PaymentStatus.CLIENT_REVIEW);
    });

    it('should update milestone paymentStatus to CLIENT_REVIEW', async () => {
      await service.transitionToClientReview('payment-1', 'user-1');
      expect(mockPrisma.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { paymentStatus: PaymentStatus.CLIENT_REVIEW },
        }),
      );
    });

    it('should create PAYMENT_STATUS_CHANGED timeline event', async () => {
      await service.transitionToClientReview('payment-1', 'user-1');
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Payment Moved to Client Review',
          metadata: expect.objectContaining({ paymentId: 'payment-1' }),
        }),
        mockPrisma,
      );
    });

    it('should include complete metadata in transitionToClientReview timeline event', async () => {
      await service.transitionToClientReview('payment-1', 'user-1');
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-1',
          actorRole: 'FREELANCER',
          agreementId: 'agreement-1',
          milestoneId: 'milestone-1',
          type: 'PAYMENT_STATUS_CHANGED',
          metadata: expect.objectContaining({
            paymentId: 'payment-1',
            previousStatus: PaymentStatus.RESERVED,
            newStatus: PaymentStatus.CLIENT_REVIEW,
          }),
        }),
        mockPrisma,
      );
    });

    it('should reject from WAITING', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.WAITING }),
      );
      await expect(
        service.transitionToClientReview('payment-1', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_TRANSITION });
    });

    it('should reject from RELEASED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.RELEASED }),
      );
      await expect(
        service.transitionToClientReview('payment-1', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_TRANSITION });
    });

    it('should reject when payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.transitionToClientReview('nonexistent', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });

    it('should handle payment without linked milestone', async () => {
      const paymentNoMilestone = makeMockPayment({
        status: PaymentStatus.RESERVED,
        milestoneId: null,
        milestone: null,
      });
      mockPrisma.payment.findUnique.mockResolvedValue(paymentNoMilestone);
      mockPrisma.payment.update.mockResolvedValue({
        ...paymentNoMilestone,
        status: PaymentStatus.CLIENT_REVIEW,
      });

      const result = await service.transitionToClientReview('payment-1', 'user-1');
      expect(result.status).toBe(PaymentStatus.CLIENT_REVIEW);
      // Should NOT try to update milestone since it doesn't exist
      expect(mockPrisma.milestone.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Phase 3: transitionToAiReview tests
  // ============================================================

  describe('transitionToAiReview', () => {
    const reviewPayment = makeMockPayment({ status: PaymentStatus.CLIENT_REVIEW });

    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.payment.findUnique.mockResolvedValue(reviewPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...reviewPayment,
        status: PaymentStatus.AI_REVIEW,
      });
      mockPrisma.milestone.update.mockResolvedValue({});
    });

    it('should transition CLIENT_REVIEW -> AI_REVIEW', async () => {
      const result = await service.transitionToAiReview('payment-1', 'user-1');
      expect(result.status).toBe(PaymentStatus.AI_REVIEW);
    });

    it('should sync milestone paymentStatus to AI_REVIEW', async () => {
      await service.transitionToAiReview('payment-1', 'user-1');
      expect(mockPrisma.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { paymentStatus: PaymentStatus.AI_REVIEW },
        }),
      );
    });

    it('should create PAYMENT_ESCALATED_TO_AI timeline event', async () => {
      await service.transitionToAiReview('payment-1', 'user-1');
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Payment Escalated to AI Review',
        }),
        mockPrisma,
      );
    });

    it('should include complete metadata in transitionToAiReview timeline event', async () => {
      await service.transitionToAiReview('payment-1', 'user-1');
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-1',
          actorRole: 'FREELANCER',
          agreementId: 'agreement-1',
          milestoneId: 'milestone-1',
          type: 'PAYMENT_ESCALATED_TO_AI',
          metadata: expect.objectContaining({
            paymentId: 'payment-1',
            previousStatus: PaymentStatus.CLIENT_REVIEW,
            newStatus: PaymentStatus.AI_REVIEW,
          }),
        }),
        mockPrisma,
      );
    });

    it('should reject from RESERVED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.RESERVED }),
      );
      await expect(
        service.transitionToAiReview('payment-1', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_TRANSITION });
    });

    it('should reject from WAITING', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.WAITING }),
      );
      await expect(
        service.transitionToAiReview('payment-1', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_TRANSITION });
    });

    it('should reject when payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.transitionToAiReview('nonexistent', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });

    it('should handle payment without linked milestone', async () => {
      const paymentNoMilestone = makeMockPayment({
        status: PaymentStatus.CLIENT_REVIEW,
        milestoneId: null,
        milestone: null,
      });
      mockPrisma.payment.findUnique.mockResolvedValue(paymentNoMilestone);
      mockPrisma.payment.update.mockResolvedValue({
        ...paymentNoMilestone,
        status: PaymentStatus.AI_REVIEW,
      });

      const result = await service.transitionToAiReview('payment-1', 'user-1');
      expect(result.status).toBe(PaymentStatus.AI_REVIEW);
      expect(mockPrisma.milestone.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Phase 3: transitionToReadyToRelease tests
  // ============================================================

  describe('transitionToReadyToRelease', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.payment.update.mockImplementation((args: any) =>
        Promise.resolve({
          ...mockPrisma.payment.findUnique.mock.calls[0]?.[0]?.result ?? makeMockPayment(),
          id: args.where.id,
          status: PaymentStatus.READY_TO_RELEASE,
          ...args.data,
        }),
      );
      mockPrisma.milestone.update.mockResolvedValue({});
    });

    it('should transition CLIENT_REVIEW -> READY_TO_RELEASE', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.CLIENT_REVIEW }),
      );
      const result = await service.transitionToReadyToRelease('payment-1', 'user-1');
      expect(result.status).toBe(PaymentStatus.READY_TO_RELEASE);
    });

    it('should transition AI_REVIEW -> READY_TO_RELEASE', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.AI_REVIEW }),
      );
      const result = await service.transitionToReadyToRelease('payment-1', 'user-1');
      expect(result.status).toBe(PaymentStatus.READY_TO_RELEASE);
    });

    it('should create PAYMENT_READY_TO_RELEASE timeline event with complete metadata', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.CLIENT_REVIEW }),
      );
      await service.transitionToReadyToRelease('payment-1', 'user-1');
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Payment Ready to Release',
          actorId: 'user-1',
          actorRole: 'FREELANCER',
          agreementId: 'agreement-1',
          milestoneId: 'milestone-1',
          type: 'PAYMENT_READY_TO_RELEASE',
          metadata: expect.objectContaining({
            paymentId: 'payment-1',
            previousStatus: PaymentStatus.CLIENT_REVIEW,
            newStatus: PaymentStatus.READY_TO_RELEASE,
          }),
        }),
        mockPrisma,
      );
    });

    it('should reject from WAITING', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.WAITING }),
      );
      await expect(
        service.transitionToReadyToRelease('payment-1', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_TRANSITION });
    });

    it('should reject from RESERVED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.RESERVED }),
      );
      await expect(
        service.transitionToReadyToRelease('payment-1', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_TRANSITION });
    });

    it('should reject when payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.transitionToReadyToRelease('nonexistent', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });

    it('should reject from RELEASED (terminal)', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.RELEASED }),
      );
      await expect(
        service.transitionToReadyToRelease('payment-1', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_TRANSITION });
    });
  });

  // ============================================================
  // Phase 3: transitionToOnHold tests
  // ============================================================

  describe('transitionToOnHold', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.payment.update.mockImplementation((args: any) =>
        Promise.resolve({
          ...mockPrisma.payment.findUnique.mock.calls[0]?.[0]?.result ?? makeMockPayment(),
          id: args.where.id,
          status: PaymentStatus.ON_HOLD,
          ...args.data,
        }),
      );
      mockPrisma.milestone.update.mockResolvedValue({});
    });

    it('should transition CLIENT_REVIEW -> ON_HOLD', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.CLIENT_REVIEW }),
      );
      const result = await service.transitionToOnHold(
        'payment-1',
        'Client requested changes',
        'user-1',
      );
      expect(result.status).toBe(PaymentStatus.ON_HOLD);
    });

    it('should transition AI_REVIEW -> ON_HOLD', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.AI_REVIEW }),
      );
      const result = await service.transitionToOnHold(
        'payment-1',
        'AI recommended hold',
        'user-1',
      );
      expect(result.status).toBe(PaymentStatus.ON_HOLD);
    });

    it('should store reason in timeline event metadata with complete context', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.CLIENT_REVIEW }),
      );
      await service.transitionToOnHold(
        'payment-1',
        'Scope change requested',
        'user-1',
      );
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-1',
          actorRole: 'FREELANCER',
          agreementId: 'agreement-1',
          milestoneId: 'milestone-1',
          type: 'PAYMENT_ON_HOLD',
          title: 'Payment On Hold',
          metadata: expect.objectContaining({
            paymentId: 'payment-1',
            previousStatus: PaymentStatus.CLIENT_REVIEW,
            newStatus: PaymentStatus.ON_HOLD,
            reason: 'Scope change requested',
          }),
        }),
        mockPrisma,
      );
    });

    it('should reject from WAITING', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.WAITING }),
      );
      await expect(
        service.transitionToOnHold('payment-1', 'reason', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_TRANSITION });
    });

    it('should reject from RESERVED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.RESERVED }),
      );
      await expect(
        service.transitionToOnHold('payment-1', 'reason', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_TRANSITION });
    });

    it('should reject when payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.transitionToOnHold('nonexistent', 'reason', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });

    it('should reject from RELEASED (terminal)', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.RELEASED }),
      );
      await expect(
        service.transitionToOnHold('payment-1', 'reason', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_TRANSITION });
    });
  });

  // ============================================================
  // Phase 3: transitionFromOnHold tests
  // ============================================================

  describe('transitionFromOnHold', () => {
    const onHoldPayment = makeMockPayment({ status: PaymentStatus.ON_HOLD });

    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.payment.findUnique.mockResolvedValue(onHoldPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...onHoldPayment,
        status: PaymentStatus.CLIENT_REVIEW,
      });
      mockPrisma.milestone.update.mockResolvedValue({});
    });

    it('should transition ON_HOLD -> CLIENT_REVIEW', async () => {
      const result = await service.transitionFromOnHold('payment-1', 'user-1');
      expect(result.status).toBe(PaymentStatus.CLIENT_REVIEW);
    });

    it('should sync milestone paymentStatus to CLIENT_REVIEW', async () => {
      await service.transitionFromOnHold('payment-1', 'user-1');
      expect(mockPrisma.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { paymentStatus: PaymentStatus.CLIENT_REVIEW },
        }),
      );
    });

    it('should create PAYMENT_STATUS_CHANGED timeline event with complete metadata', async () => {
      await service.transitionFromOnHold('payment-1', 'user-1');
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-1',
          actorRole: 'FREELANCER',
          agreementId: 'agreement-1',
          milestoneId: 'milestone-1',
          type: 'PAYMENT_STATUS_CHANGED',
          title: 'Payment Returned from Hold',
          metadata: expect.objectContaining({
            paymentId: 'payment-1',
            previousStatus: PaymentStatus.ON_HOLD,
            newStatus: PaymentStatus.CLIENT_REVIEW,
          }),
        }),
        mockPrisma,
      );
    });

    it('should reject from WAITING', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.WAITING }),
      );
      await expect(
        service.transitionFromOnHold('payment-1', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_TRANSITION });
    });

    it('should reject from RELEASED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        makeMockPayment({ status: PaymentStatus.RELEASED }),
      );
      await expect(
        service.transitionFromOnHold('payment-1', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_TRANSITION });
    });

    it('should reject when payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.transitionFromOnHold('nonexistent', 'user-1'),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });

    it('should handle payment without linked milestone', async () => {
      const paymentNoMilestone = makeMockPayment({
        status: PaymentStatus.ON_HOLD,
        milestoneId: null,
        milestone: null,
      });
      mockPrisma.payment.findUnique.mockResolvedValue(paymentNoMilestone);
      mockPrisma.payment.update.mockResolvedValue({
        ...paymentNoMilestone,
        status: PaymentStatus.CLIENT_REVIEW,
      });

      const result = await service.transitionFromOnHold('payment-1', 'user-1');
      expect(result.status).toBe(PaymentStatus.CLIENT_REVIEW);
      expect(mockPrisma.milestone.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // portalFundPayment tests
  // ============================================================

  describe('portalFundPayment', () => {
    const waitingPayment = makeMockPayment();

    beforeEach(() => {
      jest.clearAllMocks();
      clsServiceMock.getContext.mockReturnValue({
        agreementId: 'agreement-1',
        portalTokenId: 'portal-token-1',
        portalTokenType: 'PAYMENT_VIEW',
      });
      mockPrisma.payment.findUnique.mockResolvedValue(waitingPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...waitingPayment,
        status: PaymentStatus.RESERVED,
        receiptNumber: 'DHM-20260429-ABC123',
        transactionReference: 'TXN-abcdefghijklmnopqrstuvwx',
        reservedAt: new Date(),
        paymentMethodLabel: 'Demo Bank Transfer',
      });
      mockPrisma.milestone.update.mockResolvedValue({});
    });

    it('should create PAYMENT_RESERVED timeline event with CLIENT actor', async () => {
      await service.portalFund('token-1', 'payment-1', {
        amount: '1000.00',
        paymentMethodLabel: 'Demo Bank Transfer',
      });
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actorRole: 'CLIENT',
          agreementId: 'agreement-1',
          type: 'PAYMENT_RESERVED',
          title: 'Payment Funded via Client Portal',
          metadata: expect.objectContaining({
            paymentId: 'payment-1',
            previousStatus: PaymentStatus.WAITING,
            newStatus: PaymentStatus.RESERVED,
            receiptNumber: expect.any(String),
            transactionReference: expect.any(String),
          }),
        }),
        mockPrisma,
      );
    });
  });

  // ============================================================
  // portalReleaseConfirmation tests
  // ============================================================

  describe('portalReleaseConfirmation', () => {
    const readyPayment = makeMockPayment({ status: PaymentStatus.READY_TO_RELEASE });

    beforeEach(() => {
      jest.clearAllMocks();
      clsServiceMock.getContext.mockReturnValue({
        agreementId: 'agreement-1',
        portalTokenId: 'portal-token-1',
        portalTokenType: 'DELIVERY_REVIEW',
      });
      mockPrisma.payment.findUnique.mockResolvedValue(readyPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...readyPayment,
        status: PaymentStatus.RELEASED,
        releasedAt: new Date(),
      });
      mockPrisma.milestone.update.mockResolvedValue({});
    });

    it('should create PAYMENT_RELEASED timeline event with CLIENT actor', async () => {
      await service.portalReleaseConfirmation('token-1', 'payment-1', {
        confirmed: true,
        notes: 'Approved by client',
      });
      expect(mockTimeline.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actorRole: 'CLIENT',
          agreementId: 'agreement-1',
          type: 'PAYMENT_RELEASED',
          title: 'Payment Released via Client Portal',
          metadata: expect.objectContaining({
            paymentId: 'payment-1',
            previousStatus: PaymentStatus.READY_TO_RELEASE,
            newStatus: PaymentStatus.RELEASED,
            releasedAt: expect.any(String),
            notes: 'Approved by client',
          }),
        }),
        mockPrisma,
      );
    });
  });
});
