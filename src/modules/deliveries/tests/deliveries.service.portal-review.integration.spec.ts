import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryStatus, PaymentStatus, TimelineActorRole } from '@prisma/client';
import { DeliveriesService } from '../deliveries.service';
import {
  buildPrismaMock,
  buildPaymentsServiceMock,
  buildTimelineServiceMock,
  buildEmailServiceMock,
  buildClsServiceMock,
  makeMockDelivery,
  makeMockPortalToken,
} from './deliveries.service.test-utils';

describe('DeliveriesService — Portal Review Integration', () => {
  let service: DeliveriesService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let paymentsMock: ReturnType<typeof buildPaymentsServiceMock>;
  let timelineMock: ReturnType<typeof buildTimelineServiceMock>;
  let emailMock: ReturnType<typeof buildEmailServiceMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  const token = 'valid-review-token';

  beforeEach(async () => {
    prismaMock = buildPrismaMock();
    paymentsMock = buildPaymentsServiceMock();
    timelineMock = buildTimelineServiceMock();
    emailMock = buildEmailServiceMock();
    clsMock = buildClsServiceMock();

    prismaMock.delivery.create = jest.fn().mockResolvedValue(makeMockDelivery());
    prismaMock.milestone.findUnique = jest.fn().mockResolvedValue({
      id: 'milestone-1',
      agreementId: 'agreement-1',
      agreement: { id: 'agreement-1', freelancerId: 'freelancer-1', status: 'ACTIVE' },
    });
    prismaMock.$transaction = jest.fn((cb: any) => cb(prismaMock));
    prismaMock.payment = {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        { provide: require('../../../infrastructure/prisma/prisma.service').PrismaService, useValue: prismaMock },
        { provide: require('../../payments/payments.service').PaymentsService, useValue: paymentsMock },
        { provide: require('../../timeline-events/timeline-events.service').TimelineEventsService, useValue: timelineMock },
        { provide: require('../../email-notifications/email-notifications.service').EmailNotificationsService, useValue: emailMock },
        { provide: require('../../../common/cls/cls.service').ClsService, useValue: clsMock },
      ],
    }).compile();

    service = module.get<DeliveriesService>(DeliveriesService);
  });

  describe('acceptDeliveryFromPortal', () => {
    beforeEach(() => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        makeMockDelivery({ status: DeliveryStatus.SUBMITTED }),
      );
      prismaMock.portalToken.findUnique.mockResolvedValue(makeMockPortalToken());
      prismaMock.delivery.update.mockResolvedValue(
        makeMockDelivery({ status: DeliveryStatus.ACCEPTED, acceptedAt: new Date() }),
      );
      prismaMock.payment.findFirst.mockResolvedValue({
        id: 'payment-1',
        milestoneId: 'milestone-1',
        status: PaymentStatus.CLIENT_REVIEW,
      });
    });

    it('should complete full accept workflow with payment, timeline, and acceptance timing', async () => {
      const result = await (service as any).acceptDeliveryFromPortal(token, 'delivery-1', {
        note: 'Approved.',
      });

      expect(result.status).toBe(DeliveryStatus.ACCEPTED);
      expect(result.acceptedAt).toBeTruthy();

      expect(timelineMock.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DELIVERY_ACCEPTED',
          actorRole: TimelineActorRole.CLIENT,
          metadata: expect.objectContaining({
            deliveryId: 'delivery-1',
            note: 'Approved.',
          }),
        }),
        expect.anything(),
      );

      expect(paymentsMock.transitionToReadyToRelease).toHaveBeenCalledWith(
        'payment-1',
        'portal-token-1',
        TimelineActorRole.CLIENT,
      );
    });
  });

  describe('requestChangesFromPortal', () => {
    const dto = {
      reason: 'The mobile navigation still overlaps the header and needs adjustment.',
      requestedCriteria: ['Mobile navigation'],
    };

    beforeEach(() => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        makeMockDelivery({ status: DeliveryStatus.CLIENT_REVIEW }),
      );
      prismaMock.portalToken.findUnique.mockResolvedValue(makeMockPortalToken());
      prismaMock.delivery.update.mockResolvedValue(
        makeMockDelivery({
          status: DeliveryStatus.CHANGES_REQUESTED,
          clientFeedback: dto.reason,
          changesRequestedAt: new Date(),
        }),
      );
    });

    it('should complete full change-request workflow with feedback, timeline, and freelancer notification', async () => {
      const result = await (service as any).requestChangesFromPortal(token, 'delivery-1', dto);

      expect(result.status).toBe(DeliveryStatus.CHANGES_REQUESTED);
      expect(result.changesRequestedAt).toBeTruthy();

      expect(timelineMock.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DELIVERY_CHANGES_REQUESTED',
          actorRole: TimelineActorRole.CLIENT,
          metadata: expect.objectContaining({
            deliveryId: 'delivery-1',
            reason: dto.reason,
            requestedCriteria: dto.requestedCriteria,
          }),
        }),
        expect.anything(),
      );

      expect(emailMock.enqueueDeliveryChangesRequestedForFreelancer).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryId: 'delivery-1',
          reason: dto.reason,
        }),
      );
    });

    it('should not call any payment transition during change-request', async () => {
      await (service as any).requestChangesFromPortal(token, 'delivery-1', dto);
      expect(paymentsMock.transitionToOnHold).not.toHaveBeenCalled();
    });
  });
});
