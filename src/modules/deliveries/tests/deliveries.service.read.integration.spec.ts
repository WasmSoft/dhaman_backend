import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryStatus } from '@prisma/client';
import { DeliveriesService } from '../deliveries.service';
import {
  buildPrismaMock,
  buildPaymentsServiceMock,
  buildTimelineServiceMock,
  buildEmailServiceMock,
  buildClsServiceMock,
  makeMockDelivery,
} from './deliveries.service.test-utils';

describe('DeliveriesService — Read Integration', () => {
  let service: DeliveriesService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  beforeEach(async () => {
    prismaMock = buildPrismaMock();
    const paymentsMock = buildPaymentsServiceMock();
    const timelineMock = buildTimelineServiceMock();
    const emailMock = buildEmailServiceMock();
    clsMock = buildClsServiceMock();

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

  describe('getDeliveryById — full mapping', () => {
    it('should return all expected response sections', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        makeMockDelivery({
          status: DeliveryStatus.CHANGES_REQUESTED,
          clientFeedback: 'Please fix mobile header.',
          submittedAt: new Date('2026-04-30T10:00:00Z'),
          changesRequestedAt: new Date('2026-04-30T14:00:00Z'),
          milestone: {
            id: 'milestone-1',
            agreementId: 'agreement-1',
            title: 'Brand identity',
            status: 'CHANGES_REQUESTED',
            paymentStatus: 'CLIENT_REVIEW',
            deliveryStatus: 'CHANGES_REQUESTED',
            revisionLimit: 2,
          },
        }),
      );
      prismaMock.agreement.findUnique.mockResolvedValue({
        id: 'agreement-1',
        freelancerId: 'freelancer-1',
      });

      const result = await (service as any).getDeliveryById('delivery-1');

      expect(result.id).toBe('delivery-1');
      expect(result.milestone.title).toBe('Brand identity');
      expect(result.milestone.revisionLimit).toBe(2);
      expect(result.clientFeedback).toBe('Please fix mobile header.');
      expect(result.timeline.agreementId).toBe('agreement-1');
      expect(result.timeline.milestoneId).toBe('milestone-1');
    });
  });

  describe('listDeliveries — real read flow', () => {
    it('should deliver paginated and filtered results', async () => {
      prismaMock.delivery.findMany.mockResolvedValue([
        makeMockDelivery({ id: 'delivery-1' }),
        makeMockDelivery({ id: 'delivery-2', status: DeliveryStatus.ACCEPTED }),
      ]);
      prismaMock.delivery.count.mockResolvedValue(5);

      const result = await (service as any).listDeliveries({
        page: 1,
        limit: 2,
        status: 'SUBMITTED' as DeliveryStatus,
      });

      expect(result.deliveries.length).toBe(2);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });
  });
});
