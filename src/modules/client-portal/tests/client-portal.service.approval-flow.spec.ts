import { Test, TestingModule } from '@nestjs/testing';
import { AgreementStatus, TimelineActorRole, TimelineEventType } from '@prisma/client';
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
  assertNoDuplicateTimelineEvents,
} from './client-portal.service.test-utils';

describe('ClientPortalService — approval flow (US3)', () => {
  let service: ClientPortalService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let timelineMock: ReturnType<typeof buildTimelineServiceMock>;
  let emailMock: ReturnType<typeof buildEmailServiceMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  beforeEach(async () => {
    prismaMock = buildPrismaMock();
    const paymentsMock = buildPaymentsServiceMock();
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
  //  Invite → Approval flow
  // ──────────────────────────────────────────────

  describe('invite approval flow', () => {
    const sentAgreement = makeMockAgreement({
      status: 'SENT' as AgreementStatus,
      freelancer: { email: 'ahmed@example.com', name: 'Ahmed' },
    });

    it('should transition status from SENT to APPROVED', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' as AgreementStatus, approvedAt: new Date() }),
      );

      const result = await service.approve('any-token');

      expect(result.status).toBe('APPROVED');
      expect(result.agreementId).toBe('agreement-1');
      expect(result.message).toContain('approved');
    });

    it('should set CLIENT actor role on approval timeline event', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' as AgreementStatus, approvedAt: new Date() }),
      );

      await service.approve('any-token');

      assertTimelineEventExists(
        timelineMock,
        'AGREEMENT_APPROVED',
        'CLIENT',
      );
    });

    it('should create approval timeline event with correct metadata', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' as AgreementStatus, approvedAt: new Date() }),
      );

      await service.approve('any-token');

      const payload = assertTimelineEventExists(
        timelineMock,
        'AGREEMENT_APPROVED',
        'CLIENT',
      );
      expect(payload.metadata.previousStatus).toBe('SENT');
      expect(payload.actorId).toBe('token-1');
    });

    it('should set agreementId in CLS context', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' as AgreementStatus, approvedAt: new Date() }),
      );

      await service.approve('any-token');

      // CLS context should contain agreementId throughout
      expect(clsMock.getContext).toHaveBeenCalled();
    });

    it('should send approval email notification', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' as AgreementStatus, approvedAt: new Date() }),
      );
      emailMock.sendNotification.mockResolvedValue({ id: 'email-1' });

      await service.approve('any-token');

      expect(emailMock.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AGREEMENT_APPROVED',
          recipientEmail: 'ahmed@example.com',
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  //  Change-requested → Approval flow
  // ──────────────────────────────────────────────

  describe('change-requested to approved flow', () => {
    it('should allow approval from CHANGE_REQUESTED status', async () => {
      const changeReqAgreement = makeMockAgreement({
        status: 'CHANGE_REQUESTED' as AgreementStatus,
        freelancer: { email: 'ahmed@example.com', name: 'Ahmed' },
      });
      prismaMock.agreement.findUnique.mockResolvedValue(changeReqAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' as AgreementStatus, approvedAt: new Date() }),
      );

      const result = await service.approve('any-token');

      expect(result.status).toBe('APPROVED');
    });
  });

  // ──────────────────────────────────────────────
  //  Duplicate approval handling
  // ──────────────────────────────────────────────

  describe('duplicate approval', () => {
    it('should reject duplicate approval (already APPROVED)', async () => {
      const approvedAgreement = makeMockAgreement({
        status: 'APPROVED' as AgreementStatus,
        approvedAt: new Date(),
      });
      prismaMock.agreement.findUnique.mockResolvedValue(approvedAgreement);

      await expect(service.approve('any-token')).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_APPROVABLE,
      });
    });

    it('should not create duplicate timeline events on rejected duplicate approval', async () => {
      const approvedAgreement = makeMockAgreement({
        status: 'APPROVED' as AgreementStatus,
        approvedAt: new Date(),
      });
      prismaMock.agreement.findUnique.mockResolvedValue(approvedAgreement);

      await expect(service.approve('any-token')).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_APPROVABLE,
      });

      // No timeline events should have been created for the rejected attempt
      assertNoDuplicateTimelineEvents(timelineMock, 'AGREEMENT_APPROVED');
    });

    it('should not update agreement on duplicate approval attempt', async () => {
      const approvedAgreement = makeMockAgreement({
        status: 'APPROVED' as AgreementStatus,
        approvedAt: new Date(),
      });
      prismaMock.agreement.findUnique.mockResolvedValue(approvedAgreement);

      await expect(service.approve('any-token')).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_APPROVABLE,
      });

      // No update should have been called
      expect(prismaMock.agreement.update).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  //  CLS context — CLIENT_PORTAL actor
  // ──────────────────────────────────────────────

  describe('portal actor context', () => {
    it('should use CLIENT actor role for portal approval', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'SENT' as AgreementStatus }),
      );
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' as AgreementStatus, approvedAt: new Date() }),
      );

      await service.approve('any-token');

      const payload = assertTimelineEventExists(
        timelineMock,
        TimelineEventType.AGREEMENT_APPROVED,
        TimelineActorRole.CLIENT,
      );
    });

    it('should include portalTokenId as actorId in timeline event', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'SENT' as AgreementStatus }),
      );
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' as AgreementStatus, approvedAt: new Date() }),
      );

      await service.approve('any-token');

      const payload = assertTimelineEventExists(
        timelineMock,
        'AGREEMENT_APPROVED',
        'CLIENT',
      );
      expect(payload.actorId).toBe('token-1');
    });
  });
});
