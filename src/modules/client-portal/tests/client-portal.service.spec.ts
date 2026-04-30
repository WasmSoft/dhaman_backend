import { Test, TestingModule } from '@nestjs/testing';
import { AgreementStatus, TimelineEventType } from '@prisma/client';
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
  makeMockPortalToken,
} from './client-portal.service.test-utils';

describe('ClientPortalService', () => {
  let service: ClientPortalService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let paymentsMock: ReturnType<typeof buildPaymentsServiceMock>;
  let deliveriesMock: ReturnType<typeof buildDeliveriesServiceMock>;
  let timelineMock: ReturnType<typeof buildTimelineServiceMock>;
  let emailMock: ReturnType<typeof buildEmailServiceMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  beforeEach(async () => {
    prismaMock = buildPrismaMock();
    paymentsMock = buildPaymentsServiceMock();
    deliveriesMock = buildDeliveriesServiceMock();
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

  // ──────────────────────────────────────────────────────────
  //  Token Creation
  // ──────────────────────────────────────────────────────────

  describe('createPortalToken', () => {
    it('should generate a secure token and persist only hash', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement(),
      );
      prismaMock.portalToken.create.mockResolvedValue(
        makeMockPortalToken(),
      );

      const result = await service.createPortalToken('agreement-1', 'AGREEMENT_INVITE');

      expect(result.rawToken).toBeDefined();
      expect(result.rawToken.length).toBe(64); // 32 bytes hex
      expect(result.tokenId).toBe('token-1');

      // Verify hash is stored, not raw token
      const createCall = prismaMock.portalToken.create.mock.calls[0][0];
      expect(createCall.data.tokenHash).toBeDefined();
      expect(createCall.data.tokenPreview).toBeDefined();
      expect(createCall.data.tokenPreview).toHaveLength(8);
      expect(createCall.data.tokenHash).not.toBe(result.rawToken);
    });

    it('should throw AGREEMENT_NOT_FOUND when agreement does not exist', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(null);

      await expect(
        service.createPortalToken('missing-agreement', 'AGREEMENT_INVITE'),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_FOUND,
      });
    });

    it('should throw PORTAL_TOKEN_CREATE_FAILED on persistence failure', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement(),
      );
      prismaMock.portalToken.create.mockRejectedValue(new Error('DB down'));

      await expect(
        service.createPortalToken('agreement-1', 'AGREEMENT_INVITE'),
      ).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_CREATE_FAILED,
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Portal Context (CLS)
  // ──────────────────────────────────────────────────────────

  describe('getPortalContext', () => {
    it('should throw PORTAL_TOKEN_INVALID when CLS has no agreementId', async () => {
      clsMock.getContext.mockReturnValue({});

      await expect(service.getInvite('any-token')).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_INVALID,
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  //  getInvite
  // ──────────────────────────────────────────────────────────

  describe('getInvite', () => {
    it('should return invite summary with milestones and payments', async () => {
      const agreement = makeMockAgreement({
        milestones: [
          { id: 'm1', order: 1, title: 'Logo', description: 'Logo design', amount: '2500.00', currency: 'SAR', status: 'DRAFT', dueDate: new Date('2026-02-01') },
          { id: 'm2', order: 2, title: 'Brand book', description: null, amount: '2500.00', currency: 'SAR', status: 'DRAFT', dueDate: new Date('2026-03-01') },
        ],
        payments: [
          { id: 'p1', milestoneId: 'm1', amount: '2500.00', currency: 'SAR', status: 'WAITING' },
          { id: 'p2', milestoneId: 'm2', amount: '2500.00', currency: 'SAR', status: 'WAITING' },
        ],
      });
      prismaMock.agreement.findUnique.mockResolvedValue(agreement);

      const result = await service.getInvite('any-token');

      expect(result.agreementId).toBe('agreement-1');
      expect(result.freelancer.name).toBe('Ahmed Hassan');
      expect(result.client.name).toBe('Sara Al-Rashid');
      expect(result.milestones).toHaveLength(2);
      expect(result.paymentSchedule).toHaveLength(2);
    });

    it('should return empty arrays when no milestones or payments', async () => {
      const agreement = makeMockAgreement();
      prismaMock.agreement.findUnique.mockResolvedValue(agreement);

      const result = await service.getInvite('any-token');

      expect(result.milestones).toEqual([]);
      expect(result.paymentSchedule).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────────────────
  //  approve
  // ──────────────────────────────────────────────────────────

  describe('approve', () => {
    const sentAgreement = makeMockAgreement({ status: 'SENT' as AgreementStatus });
    const approvedAgreement = makeMockAgreement({ status: 'APPROVED' as AgreementStatus });

    it('should approve agreement when status is SENT', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' as AgreementStatus, approvedAt: new Date() }),
      );

      const result = await service.approve('any-token');

      expect(result.status).toBe('APPROVED');
      expect(result.message).toContain('approved');
    });

    it('should throw AGREEMENT_NOT_APPROVABLE for non-sent agreements', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(approvedAgreement);

      await expect(service.approve('any-token')).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_APPROVABLE,
      });
    });

    it('should send email notification on approval (non-blocking)', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue({
        ...sentAgreement,
        freelancer: { email: 'ahmed@example.com', name: 'Ahmed' },
        status: 'SENT',
      });
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' as AgreementStatus, approvedAt: new Date() }),
      );
      emailMock.sendNotification.mockResolvedValue({ id: 'email-1' });

      const result = await service.approve('any-token');

      expect(result.status).toBe('APPROVED');
      expect(emailMock.sendNotification).toHaveBeenCalled();
    });

    it('should not fail when email notification throws', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue({
        ...sentAgreement,
        freelancer: { email: 'ahmed@example.com', name: 'Ahmed' },
        status: 'SENT',
      });
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' as AgreementStatus, approvedAt: new Date() }),
      );
      emailMock.sendNotification.mockRejectedValue(new Error('Email down'));

      const result = await service.approve('any-token');

      expect(result.status).toBe('APPROVED');
    });
  });

  // ──────────────────────────────────────────────────────────
  //  requestChanges
  // ──────────────────────────────────────────────────────────

  describe('requestChanges', () => {
    it('should transition status to CHANGE_REQUESTED', async () => {
      const agreement = makeMockAgreement({ status: 'SENT' as AgreementStatus });
      prismaMock.agreement.findUnique.mockResolvedValue(agreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'CHANGE_REQUESTED' as AgreementStatus }),
      );

      const result = await service.requestChanges('any-token', {
        reason: 'The milestones need adjustment for the timeline.',
      });

      expect(result.status).toBe('CHANGE_REQUESTED');
    });

    it('should throw AGREEMENT_NOT_CHANGEABLE for non-sent agreements', async () => {
      const agreement = makeMockAgreement({ status: 'APPROVED' as AgreementStatus });
      prismaMock.agreement.findUnique.mockResolvedValue(agreement);

      await expect(
        service.requestChanges('any-token', {
          reason: 'The milestones need adjustment.',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_CHANGEABLE,
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  //  rejectAgreement
  // ──────────────────────────────────────────────────────────

  describe('rejectAgreement', () => {
    it('should transition status to CANCELLED', async () => {
      const agreement = makeMockAgreement({ status: 'SENT' as AgreementStatus });
      prismaMock.agreement.findUnique.mockResolvedValue(agreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'CANCELLED' as AgreementStatus }),
      );

      const result = await service.rejectAgreement('any-token', {
        reason: 'Budget does not match our current requirements.',
      });

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw AGREEMENT_NOT_REJECTABLE for non-sent agreements', async () => {
      const agreement = makeMockAgreement({ status: 'APPROVED' as AgreementStatus });
      prismaMock.agreement.findUnique.mockResolvedValue(agreement);

      await expect(
        service.rejectAgreement('any-token', {
          reason: 'Budget does not match our current requirements.',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_REJECTABLE,
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  //  getPortal (workspace)
  // ──────────────────────────────────────────────────────────

  describe('getPortal', () => {
    it('should return full workspace scoped to token agreement', async () => {
      const agreement = makeMockAgreement({
        milestones: [
          { id: 'm1', order: 1, title: 'Logo', description: null, amount: '2500.00', currency: 'SAR', status: 'DRAFT', dueDate: new Date('2026-02-01') },
        ],
        payments: [
          { id: 'p1', milestoneId: 'm1', amount: '2500.00', currency: 'SAR', status: 'WAITING' },
        ],
        deliveries: [
          { id: 'd1', milestoneId: 'm1', status: 'SUBMITTED', submittedAt: new Date(), notes: null, milestone: { title: 'Logo' } },
        ],
        changeRequests: [],
        aiReviews: [],
        timelineEvents: [
          { id: 't1', type: 'AGREEMENT_APPROVED', actorRole: 'CLIENT', description: 'Approved', createdAt: new Date() },
        ],
      });
      prismaMock.agreement.findUnique.mockResolvedValue(agreement);

      const result = await service.getPortal('any-token');

      expect(result.agreementId).toBe('agreement-1');
      expect(result.milestones).toHaveLength(1);
      expect(result.payments).toHaveLength(1);
      expect(result.deliveries).toHaveLength(1);
      expect(result.timeline).toHaveLength(1);
    });

    it('should return empty arrays for absent sub-resources', async () => {
      const agreement = makeMockAgreement();
      prismaMock.agreement.findUnique.mockResolvedValue(agreement);

      const result = await service.getPortal('any-token');

      expect(result.milestones).toEqual([]);
      expect(result.payments).toEqual([]);
      expect(result.deliveries).toEqual([]);
      expect(result.changeRequests).toEqual([]);
      expect(result.aiReviews).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────────────────
  //  getDelivery
  // ──────────────────────────────────────────────────────────

  describe('getDelivery', () => {
    it('should return delivery scoped to token agreement', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: 'd1',
        agreementId: 'agreement-1',
        milestoneId: 'm1',
        status: 'SUBMITTED',
        submittedAt: new Date(),
        notes: null,
        milestone: { title: 'Logo' },
      });

      const result = await service.getDelivery('any-token', 'd1');

      expect(result.id).toBe('d1');
      expect(result.milestoneTitle).toBe('Logo');
    });

    it('should throw DELIVERY_NOT_FOUND for cross-agreement delivery', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: 'd2',
        agreementId: 'other-agreement',
        milestoneId: 'm1',
        status: 'SUBMITTED',
        submittedAt: null,
        notes: null,
        milestone: { title: 'Other' },
      });

      await expect(
        service.getDelivery('any-token', 'd2'),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_FOUND,
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Delegated Delivery Actions
  // ──────────────────────────────────────────────────────────

  describe('acceptDelivery', () => {
    it('should delegate to DeliveriesService', async () => {
      deliveriesMock.acceptDeliveryFromPortal.mockResolvedValue({ id: 'd1', status: 'ACCEPTED' });

      const result = await service.acceptDelivery('any-token', 'd1');

      expect(deliveriesMock.acceptDeliveryFromPortal).toHaveBeenCalledWith('any-token', 'd1');
      expect(result.status).toBe('ACCEPTED');
    });
  });

  describe('requestDeliveryChanges', () => {
    it('should delegate to DeliveriesService', async () => {
      deliveriesMock.requestChangesFromPortal.mockResolvedValue({ id: 'd1', status: 'CHANGES_REQUESTED' });

      const result = await service.requestDeliveryChanges('any-token', 'd1', {
        reason: 'Navigation overlaps header on mobile.',
        requestedChanges: ['Mobile navigation'],
      });

      expect(deliveriesMock.requestChangesFromPortal).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Delegated Payment Actions
  // ──────────────────────────────────────────────────────────

  describe('fundPayment', () => {
    it('should delegate to PaymentsService portalFund', async () => {
      paymentsMock.portalFund.mockResolvedValue({ id: 'p1', status: 'RESERVED' });

      const result = await service.fundPayment('any-token', 'p1', {
        amount: '2500.00',
      });

      expect(paymentsMock.portalFund).toHaveBeenCalledWith('any-token', 'p1', {
        amount: '2500.00',
      });
    });
  });

  describe('releasePayment', () => {
    it('should delegate to PaymentsService portalReleaseConfirmation', async () => {
      paymentsMock.portalReleaseConfirmation.mockResolvedValue({ id: 'p1', status: 'RELEASED' });

      const result = await service.releasePayment('any-token', 'p1', {
        confirmed: true,
        notes: 'Approved.',
      });

      expect(paymentsMock.portalReleaseConfirmation).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Payment List and History
  // ──────────────────────────────────────────────────────────

  describe('getPayments', () => {
    it('should return payment plan for agreement', async () => {
      prismaMock.payment.findMany.mockResolvedValue([
        { id: 'p1', milestoneId: 'm1', amount: '2500.00', currency: 'SAR', status: 'WAITING', demoMode: true, reservedAt: null, releasedAt: null, createdAt: new Date() },
      ]);
      prismaMock.milestone.findMany.mockResolvedValue([
        { id: 'm1', title: 'Logo' },
      ]);

      const result = await service.getPayments('any-token');

      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].milestoneTitle).toBe('Logo');
    });
  });

  describe('getPaymentHistory', () => {
    it('should return payment history for agreement', async () => {
      prismaMock.payment.findMany.mockResolvedValue([
        { id: 'p1', milestoneId: 'm1', amount: '2500.00', currency: 'SAR', status: 'RELEASED', demoMode: true, reservedAt: new Date(), releasedAt: new Date(), createdAt: new Date() },
      ]);
      prismaMock.milestone.findMany.mockResolvedValue([
        { id: 'm1', title: 'Logo' },
      ]);

      const result = await service.getPaymentHistory('any-token');

      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].status).toBe('RELEASED');
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Timeline
  // ──────────────────────────────────────────────────────────

  describe('getTimeline', () => {
    it('should return timeline events for agreement', async () => {
      prismaMock.timelineEvent.findMany.mockResolvedValue([
        { id: 't1', type: 'AGREEMENT_APPROVED', actorRole: 'CLIENT', description: 'Approved', createdAt: new Date() },
      ]);

      const result = await service.getTimeline('any-token');

      expect(result).toHaveLength(1);
      expect(result[0].eventType).toBe('AGREEMENT_APPROVED');
    });

    it('should return empty array when no events', async () => {
      prismaMock.timelineEvent.findMany.mockResolvedValue([]);

      const result = await service.getTimeline('any-token');

      expect(result).toEqual([]);
    });
  });
});
