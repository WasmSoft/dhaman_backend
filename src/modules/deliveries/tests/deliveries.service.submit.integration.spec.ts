import { Test, TestingModule } from '@nestjs/testing';
import {
  DeliveryStatus,
  PaymentStatus,
  TimelineActorRole,
} from '@prisma/client';
import { DeliveriesService } from '../deliveries.service';
import {
  buildPrismaMock,
  buildPaymentsServiceMock,
  buildTimelineServiceMock,
  buildEmailServiceMock,
  buildClsServiceMock,
  makeMockDelivery,
} from './deliveries.service.test-utils';

describe('DeliveriesService — Submit Integration', () => {
  let service: DeliveriesService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let paymentsMock: ReturnType<typeof buildPaymentsServiceMock>;
  let timelineMock: ReturnType<typeof buildTimelineServiceMock>;
  let emailMock: ReturnType<typeof buildEmailServiceMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  const submittedDelivery = makeMockDelivery({
    deliveryUrl: 'https://example.com/work',
    status: DeliveryStatus.SUBMITTED,
    submittedAt: new Date(),
  });

  beforeEach(async () => {
    prismaMock = buildPrismaMock();
    paymentsMock = buildPaymentsServiceMock();
    timelineMock = buildTimelineServiceMock();
    emailMock = buildEmailServiceMock();
    clsMock = buildClsServiceMock();

    prismaMock.delivery.create = jest
      .fn()
      .mockResolvedValue(makeMockDelivery());
    prismaMock.milestone.findUnique = jest.fn().mockResolvedValue({
      id: 'milestone-1',
      agreementId: 'agreement-1',
      agreement: {
        id: 'agreement-1',
        freelancerId: 'freelancer-1',
        status: 'ACTIVE',
      },
    });
    prismaMock.$transaction = jest.fn((cb: any) => cb(prismaMock));
    prismaMock.payment = {
      findFirst: jest.fn().mockResolvedValue({
        id: 'payment-1',
        milestoneId: 'milestone-1',
        status: PaymentStatus.RESERVED,
      }),
      findUnique: jest.fn(),
    };

    prismaMock.delivery.findUnique.mockResolvedValue(
      makeMockDelivery({
        deliveryUrl: 'https://example.com/work',
        status: DeliveryStatus.DRAFT,
      }),
    );
    prismaMock.delivery.update.mockResolvedValue(submittedDelivery);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        {
          provide: require('../../../infrastructure/prisma/prisma.service')
            .PrismaService,
          useValue: prismaMock,
        },
        {
          provide: require('../../payments/payments.service').PaymentsService,
          useValue: paymentsMock,
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
        {
          provide: require('../../../common/cls/cls.service').ClsService,
          useValue: clsMock,
        },
      ],
    }).compile();

    service = module.get<DeliveriesService>(DeliveriesService);
  });

  it('should orchestrate the full submit workflow', async () => {
    const result = await (service as any).submitDelivery('delivery-1', {
      noteToClient: 'Please review on tablet.',
    });

    expect(result.status).toBe(DeliveryStatus.SUBMITTED);
    expect(result.submittedAt).toBeTruthy();

    expect(timelineMock.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DELIVERY_SUBMITTED',
        actorRole: TimelineActorRole.FREELANCER,
        metadata: expect.objectContaining({
          deliveryId: 'delivery-1',
          noteToClient: 'Please review on tablet.',
        }),
      }),
      expect.anything(),
    );

    expect(paymentsMock.transitionToClientReview).toHaveBeenCalledWith(
      'payment-1',
      'freelancer-1',
      TimelineActorRole.FREELANCER,
    );
  });

  it('should not block submit when email fails', async () => {
    emailMock.enqueueDeliverySubmittedForClient.mockRejectedValue(
      new Error('email error'),
    );
    const result = await (service as any).submitDelivery('delivery-1', {});
    expect(result.status).toBe(DeliveryStatus.SUBMITTED);
    expect(paymentsMock.transitionToClientReview).toHaveBeenCalled();
  });
});
