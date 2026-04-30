import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryStatus, PaymentStatus, TimelineActorRole } from '@prisma/client';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { DeliveriesService } from '../deliveries.service';
import {
  buildPrismaMock,
  buildPaymentsServiceMock,
  buildTimelineServiceMock,
  buildEmailServiceMock,
  buildClsServiceMock,
  makeMockDelivery,
} from './deliveries.service.test-utils';

describe('DeliveriesService — Submit', () => {
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

  describe('submitDelivery', () => {
    beforeEach(() => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        makeMockDelivery({ deliveryUrl: 'https://example.com/work', status: DeliveryStatus.DRAFT }),
      );
      prismaMock.delivery.update.mockResolvedValue(
        makeMockDelivery({ status: DeliveryStatus.SUBMITTED, submittedAt: new Date() }),
      );
      prismaMock.payment.findFirst.mockResolvedValue({
        id: 'payment-1',
        milestoneId: 'milestone-1',
        status: PaymentStatus.RESERVED,
      });
    });

    it('should submit a delivery with evidence and reserved payment', async () => {
      const result = await (service as any).submitDelivery('delivery-1', {});
      expect(result.status).toBe(DeliveryStatus.SUBMITTED);
      expect(paymentsMock.transitionToClientReview).toHaveBeenCalled();
      expect(timelineMock.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DELIVERY_SUBMITTED' }),
        expect.anything(),
      );
    });

    it('should reject when delivery has no evidence', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        makeMockDelivery({ summary: 'Short', deliveryUrl: null, fileUrl: null, status: DeliveryStatus.DRAFT }),
      );
      await expect((service as any).submitDelivery('delivery-1', {}))
        .rejects.toMatchObject({ code: ErrorCode.DELIVERY_EVIDENCE_REQUIRED });
    });

    it('should reject when payment is not reserved', async () => {
      prismaMock.payment.findFirst.mockResolvedValue(null);
      await expect((service as any).submitDelivery('delivery-1', {}))
        .rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_RESERVED });
    });

    it('should reject when delivery is not editable', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        makeMockDelivery({ status: DeliveryStatus.SUBMITTED }),
      );
      await expect((service as any).submitDelivery('delivery-1', {}))
        .rejects.toMatchObject({ code: ErrorCode.DELIVERY_NOT_SUBMITTABLE });
    });

    it('should not roll back on email failure', async () => {
      emailMock.enqueueDeliverySubmittedForClient.mockRejectedValue(new Error('email fail'));
      const result = await (service as any).submitDelivery('delivery-1', {});
      expect(result.status).toBe(DeliveryStatus.SUBMITTED);
    });
  });
});
