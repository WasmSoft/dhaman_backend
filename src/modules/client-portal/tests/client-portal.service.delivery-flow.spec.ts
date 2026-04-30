import { Test, TestingModule } from '@nestjs/testing';
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
} from './client-portal.service.test-utils';

describe('ClientPortalService — delivery flow (US3)', () => {
  let service: ClientPortalService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let deliveriesMock: ReturnType<typeof buildDeliveriesServiceMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  beforeEach(async () => {
    prismaMock = buildPrismaMock();
    const paymentsMock = buildPaymentsServiceMock();
    deliveriesMock = buildDeliveriesServiceMock();
    const timelineMock = buildTimelineServiceMock();
    const emailMock = buildEmailServiceMock();
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
  //  Delivery acceptance flow
  // ──────────────────────────────────────────────

  describe('acceptDelivery flow', () => {
    it('should delegate acceptance to DeliveriesService.acceptDeliveryFromPortal', async () => {
      deliveriesMock.acceptDeliveryFromPortal.mockResolvedValue({
        id: 'd1',
        status: 'ACCEPTED',
        message: 'Delivery accepted.',
      });

      const result = await service.acceptDelivery('any-token', 'd1');

      expect(deliveriesMock.acceptDeliveryFromPortal).toHaveBeenCalledWith('any-token', 'd1');
      expect(result.status).toBe('ACCEPTED');
    });

    it('should propagate DELIVERY_NOT_FOUND from DeliveriesService', async () => {
      deliveriesMock.acceptDeliveryFromPortal.mockRejectedValue(
        new (require('../../../common/errors/app-exception').AppException)({
          code: ErrorCode.DELIVERY_NOT_FOUND,
        }),
      );

      await expect(
        service.acceptDelivery('any-token', 'd1'),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_FOUND,
      });
    });

    it('should propagate DELIVERY_NOT_REVIEWABLE from DeliveriesService', async () => {
      deliveriesMock.acceptDeliveryFromPortal.mockRejectedValue(
        new (require('../../../common/errors/app-exception').AppException)({
          code: ErrorCode.DELIVERY_NOT_REVIEWABLE,
        }),
      );

      await expect(
        service.acceptDelivery('any-token', 'd1'),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_REVIEWABLE,
      });
    });
  });

  // ──────────────────────────────────────────────
  //  Delivery change request flow
  // ──────────────────────────────────────────────

  describe('requestDeliveryChanges flow', () => {
    const dto = {
      reason: 'Navigation overlaps header on mobile.',
      requestedChanges: ['Mobile navigation', 'Footer alignment'],
    };

    it('should delegate change request to DeliveriesService.requestChangesFromPortal', async () => {
      deliveriesMock.requestChangesFromPortal.mockResolvedValue({
        id: 'd1',
        status: 'CHANGES_REQUESTED',
        message: 'Changes requested.',
      });

      const result = await service.requestDeliveryChanges('any-token', 'd1', dto);

      expect(deliveriesMock.requestChangesFromPortal).toHaveBeenCalledWith(
        'any-token',
        'd1',
        {
          reason: dto.reason,
          requestedCriteria: dto.requestedChanges,
        },
      );
      expect(result.status).toBe('CHANGES_REQUESTED');
    });

    it('should propagate DELIVERY_NOT_FOUND from DeliveriesService', async () => {
      deliveriesMock.requestChangesFromPortal.mockRejectedValue(
        new (require('../../../common/errors/app-exception').AppException)({
          code: ErrorCode.DELIVERY_NOT_FOUND,
        }),
      );

      await expect(
        service.requestDeliveryChanges('any-token', 'd1', dto),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_FOUND,
      });
    });

    it('should propagate DELIVERY_NOT_REVIEWABLE from DeliveriesService on change request', async () => {
      deliveriesMock.requestChangesFromPortal.mockRejectedValue(
        new (require('../../../common/errors/app-exception').AppException)({
          code: ErrorCode.DELIVERY_NOT_REVIEWABLE,
        }),
      );

      await expect(
        service.requestDeliveryChanges('any-token', 'd1', dto),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_REVIEWABLE,
      });
    });
  });

  // ──────────────────────────────────────────────
  //  Delivery detail scoped to agreement
  // ──────────────────────────────────────────────

  describe('getDelivery scoping', () => {
    it('should return delivery scoped to token agreement', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: 'd1',
        agreementId: 'agreement-1',
        milestoneId: 'm1',
        status: 'SUBMITTED',
        submittedAt: new Date('2026-02-15'),
        notes: 'Ready for review',
        milestone: { title: 'Logo Design' },
      });

      const result = await service.getDelivery('any-token', 'd1');

      expect(result.id).toBe('d1');
      expect(result.milestoneTitle).toBe('Logo Design');
      expect(result.status).toBe('SUBMITTED');
    });

    it('should mask cross-agreement delivery as not found', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: 'd2',
        agreementId: 'other-agreement',
        milestoneId: 'm1',
        status: 'SUBMITTED',
        submittedAt: new Date(),
        notes: null,
        milestone: { title: 'Other' },
      });

      await expect(
        service.getDelivery('any-token', 'd2'),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_FOUND,
      });
    });

    it('should throw DELIVERY_NOT_FOUND when delivery does not exist', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(null);

      await expect(
        service.getDelivery('any-token', 'nonexistent'),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_FOUND,
      });
    });
  });
});
