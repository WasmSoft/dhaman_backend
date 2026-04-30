import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryStatus } from '@prisma/client';
import { DeliveriesService } from '../deliveries.service';
import {
  buildPrismaMock,
  buildPaymentsServiceMock,
  buildTimelineServiceMock,
  buildEmailServiceMock,
  buildClsServiceMock,
  makeMockMilestone,
  makeMockDelivery,
} from './deliveries.service.test-utils';

describe('DeliveriesService — Read (list / detail)', () => {
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

  describe('getDeliveryById', () => {
    const delivery = makeMockDelivery();

    beforeEach(() => {
      prismaMock.delivery.findUnique.mockResolvedValue(delivery);
      prismaMock.agreement.findUnique.mockResolvedValue({
        id: 'agreement-1',
        freelancerId: 'freelancer-1',
      });
    });

    it('should return an owned delivery detail', async () => {
      const result = await (service as any).getDeliveryById('delivery-1');
      expect(result.id).toBe('delivery-1');
      expect(result.milestone).toBeDefined();
    });

    it('should reject when delivery not found', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(null);
      await expect(
        (service as any).getDeliveryById('delivery-1'),
      ).rejects.toMatchObject({ code: 'DELIVERY_NOT_FOUND' });
    });

    it('should reject when delivery is not owned by the freelancer', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue({
        id: 'agreement-1',
        freelancerId: 'other-freelancer',
      });
      await expect(
        (service as any).getDeliveryById('delivery-1'),
      ).rejects.toMatchObject({ code: 'DELIVERY_NOT_FOUND' });
    });
  });

  describe('listDeliveries', () => {
    beforeEach(() => {
      prismaMock.delivery.findMany.mockResolvedValue([
        makeMockDelivery(),
        makeMockDelivery({ id: 'delivery-2' }),
      ]);
      prismaMock.delivery.count.mockResolvedValue(2);
    });

    it('should return paginated owned deliveries', async () => {
      const result = await (service as any).listDeliveries({});
      expect(result.deliveries.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should pass filters to delivery query', async () => {
      await (service as any).listDeliveries({
        agreementId: 'agreement-1',
        status: 'DRAFT' as DeliveryStatus,
        page: 2,
        limit: 10,
      });
      expect(prismaMock.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'DRAFT',
            agreementId: 'agreement-1',
          }),
          skip: 10,
          take: 10,
        }),
      );
    });
  });
});
