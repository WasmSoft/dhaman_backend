import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryStatus, TimelineActorRole } from '@prisma/client';
import { ErrorCode } from '../../../common/enums/error-code.enum';
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

describe('DeliveriesService — Portal Review', () => {
  let service: DeliveriesService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let paymentsMock: ReturnType<typeof buildPaymentsServiceMock>;
  let timelineMock: ReturnType<typeof buildTimelineServiceMock>;
  let emailMock: ReturnType<typeof buildEmailServiceMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  beforeEach(async () => {
    prismaMock = buildPrismaMock();
    paymentsMock = buildPaymentsServiceMock();
    timelineMock = buildTimelineServiceMock();
    emailMock = buildEmailServiceMock();
    clsMock = buildClsServiceMock();

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
    const token = 'valid-review-token';
    const portalToken = makeMockPortalToken();

    beforeEach(() => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        makeMockDelivery({ status: DeliveryStatus.SUBMITTED }),
      );
      prismaMock.portalToken.findUnique.mockResolvedValue(portalToken);
      prismaMock.delivery.update.mockResolvedValue(
        makeMockDelivery({ status: DeliveryStatus.ACCEPTED, acceptedAt: new Date() }),
      );
      prismaMock.payment.findFirst.mockResolvedValue({
        id: 'payment-1',
        milestoneId: 'milestone-1',
      });
    });

    it('should accept a reviewable delivery with a valid token', async () => {
      const result = await (service as any).acceptDeliveryFromPortal(token, 'delivery-1');
      expect(result.status).toBe(DeliveryStatus.ACCEPTED);
      expect(paymentsMock.transitionToReadyToRelease).toHaveBeenCalled();
      expect(timelineMock.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DELIVERY_ACCEPTED' }),
        expect.anything(),
      );
    });

    it('should reject invalid portal token', async () => {
      prismaMock.portalToken.findUnique.mockResolvedValue(null);
      await expect((service as any).acceptDeliveryFromPortal(token, 'delivery-1'))
        .rejects.toMatchObject({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    });

    it('should reject when token agreement does not match delivery', async () => {
      prismaMock.portalToken.findUnique.mockResolvedValue(
        makeMockPortalToken({ agreementId: 'other-agreement' }),
      );
      await expect((service as any).acceptDeliveryFromPortal(token, 'delivery-1'))
        .rejects.toMatchObject({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    });

    it('should reject when delivery is not reviewable', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        makeMockDelivery({ status: DeliveryStatus.ACCEPTED }),
      );
      await expect((service as any).acceptDeliveryFromPortal(token, 'delivery-1'))
        .rejects.toMatchObject({ code: ErrorCode.DELIVERY_NOT_REVIEWABLE });
    });
  });

  describe('requestChangesFromPortal', () => {
    const token = 'valid-review-token';
    const dto = { reason: 'The mobile navigation still overlaps the header and needs adjustment.' };

    beforeEach(() => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        makeMockDelivery({ status: DeliveryStatus.SUBMITTED }),
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

    it('should request changes on a reviewable delivery', async () => {
      const result = await (service as any).requestChangesFromPortal(token, 'delivery-1', dto);
      expect(result.status).toBe(DeliveryStatus.CHANGES_REQUESTED);
      expect(timelineMock.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DELIVERY_CHANGES_REQUESTED' }),
        expect.anything(),
      );
    });

    it('should not block on email failure', async () => {
      emailMock.enqueueDeliveryChangesRequestedForFreelancer.mockRejectedValue(
        new Error('email fail'),
      );
      const result = await (service as any).requestChangesFromPortal(token, 'delivery-1', dto);
      expect(result.status).toBe(DeliveryStatus.CHANGES_REQUESTED);
    });
  });
});
