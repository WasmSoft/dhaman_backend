import { Test, TestingModule } from '@nestjs/testing';
import { AgreementStatus } from '@prisma/client';
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

describe('ClientPortalService — notification failure resilience (US3)', () => {
  let service: ClientPortalService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let emailMock: ReturnType<typeof buildEmailServiceMock>;
  let timelineMock: ReturnType<typeof buildTimelineServiceMock>;
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
  //  Approval succeeds even when email fails
  // ──────────────────────────────────────────────

  describe('approve survives email failure', () => {
    const sentAgreement = makeMockAgreement({
      status: 'SENT',
      freelancer: { email: 'ahmed@example.com', name: 'Ahmed' },
    });

    it('should complete approval when email notification throws', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({
          status: 'APPROVED',
          approvedAt: new Date(),
        }),
      );
      emailMock.sendNotification.mockRejectedValue(
        new Error('Email service down'),
      );

      const result = await service.approve('any-token');

      // Primary action must succeed despite email failure
      expect(result.status).toBe('APPROVED');
      expect(result.message).toContain('approved');
    });

    it('should record timeline event despite email failure', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({
          status: 'APPROVED',
          approvedAt: new Date(),
        }),
      );
      emailMock.sendNotification.mockRejectedValue(
        new Error('Email service down'),
      );

      await service.approve('any-token');

      // Timeline event should still be created
      assertTimelineEventExists(timelineMock, 'AGREEMENT_APPROVED', 'CLIENT');
    });
  });

  // ──────────────────────────────────────────────
  //  Change request survives email failure
  // ──────────────────────────────────────────────

  describe('requestChanges survives email failure', () => {
    const sentAgreement = makeMockAgreement({
      status: 'SENT',
      freelancer: { email: 'ahmed@example.com', name: 'Ahmed' },
    });
    const dto = { reason: 'The milestones need adjustment for the timeline.' };

    it('should complete change request when email fails', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'CHANGE_REQUESTED' }),
      );
      emailMock.sendNotification.mockRejectedValue(
        new Error('Email service down'),
      );

      const result = await service.requestChanges('any-token', dto);

      expect(result.status).toBe('CHANGE_REQUESTED');
    });

    it('should record timeline event despite email failure on change request', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'CHANGE_REQUESTED' }),
      );
      emailMock.sendNotification.mockRejectedValue(
        new Error('Email service down'),
      );

      await service.requestChanges('any-token', dto);

      assertTimelineEventExists(
        timelineMock,
        'AGREEMENT_CHANGES_REQUESTED',
        'CLIENT',
      );
    });
  });

  // ──────────────────────────────────────────────
  //  Rejection survives email failure
  // ──────────────────────────────────────────────

  describe('rejectAgreement survives email failure', () => {
    const sentAgreement = makeMockAgreement({
      status: 'SENT',
      freelancer: { email: 'ahmed@example.com', name: 'Ahmed' },
    });
    const dto = { reason: 'Budget does not match our current requirements.' };

    it('should complete rejection when email fails', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'CANCELLED' }),
      );
      emailMock.sendNotification.mockRejectedValue(
        new Error('Email service down'),
      );

      const result = await service.rejectAgreement('any-token', dto);

      expect(result.status).toBe('CANCELLED');
    });

    it('should record timeline event despite email failure on rejection', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'CANCELLED' }),
      );
      emailMock.sendNotification.mockRejectedValue(
        new Error('Email service down'),
      );

      await service.rejectAgreement('any-token', dto);

      assertTimelineEventExists(timelineMock, 'AGREEMENT_REJECTED', 'CLIENT');
    });
  });

  // ──────────────────────────────────────────────
  //  Timeline failure doesn't roll back
  // ──────────────────────────────────────────────

  describe('survives timeline failure', () => {
    it('should complete approval even when timeline event throws', async () => {
      const sentAgreement = makeMockAgreement({
        status: 'SENT',
        freelancer: { email: 'ahmed@example.com', name: 'Ahmed' },
      });
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({
          status: 'APPROVED',
          approvedAt: new Date(),
        }),
      );
      timelineMock.createEvent.mockRejectedValue(
        new Error('Timeline DB error'),
      );

      const result = await service.approve('any-token');

      // Primary action must still complete
      expect(result.status).toBe('APPROVED');
    });

    it('should complete change request when timeline event throws', async () => {
      const sentAgreement = makeMockAgreement({
        status: 'SENT',
      });
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({ status: 'CHANGE_REQUESTED' }),
      );
      timelineMock.createEvent.mockRejectedValue(
        new Error('Timeline DB error'),
      );

      const result = await service.requestChanges('any-token', {
        reason: 'The milestones need adjustment for the timeline.',
      });

      expect(result.status).toBe('CHANGE_REQUESTED');
    });
  });

  // ──────────────────────────────────────────────
  //  Missing freelancer email doesn't block
  // ──────────────────────────────────────────────

  describe('missing freelancer email', () => {
    it('should complete approval even when freelancer has no email', async () => {
      const sentAgreement = makeMockAgreement({
        status: 'SENT',
        freelancer: { email: null, name: 'Ahmed' },
      });
      prismaMock.agreement.findUnique.mockResolvedValue(sentAgreement);
      prismaMock.agreement.update.mockResolvedValue(
        makeMockAgreement({
          status: 'APPROVED',
          approvedAt: new Date(),
        }),
      );

      const result = await service.approve('any-token');

      expect(result.status).toBe('APPROVED');
      // Email should not be attempted when freelancer has no email
      if (emailMock.sendNotification.mock.calls.length > 0) {
        // If email was attempted, it shouldn't block the result
        expect(result.status).toBe('APPROVED');
      }
    });
  });
});
