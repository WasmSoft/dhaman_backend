import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryStatus } from '@prisma/client';
import { ErrorCode } from '../../../common/enums/error-code.enum';
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

describe('DeliveriesService — Create / Update', () => {
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

  describe('createDelivery', () => {
    const milestone = makeMockMilestone();
    const dto = { summary: 'Completed the homepage redesign with responsive navigation.' };

    beforeEach(() => {
      prismaMock.milestone.findUnique.mockResolvedValue(milestone);
      prismaMock.delivery.findFirst.mockResolvedValue(null);
      prismaMock.delivery.create.mockResolvedValue(makeMockDelivery());
    });

    it('should create a draft delivery for an owned milestone', async () => {
      const result = await (service as any).createDelivery('milestone-1', dto);
      expect(result.status).toBe(DeliveryStatus.DRAFT);
      expect(prismaMock.delivery.create).toHaveBeenCalled();
    });

    it('should reject when milestone not found', async () => {
      prismaMock.milestone.findUnique.mockResolvedValue(null);
      await expect((service as any).createDelivery('milestone-1', dto))
        .rejects.toMatchObject({ code: ErrorCode.MILESTONE_NOT_FOUND });
    });

    it('should reject when an editable delivery already exists', async () => {
      prismaMock.delivery.findFirst.mockResolvedValue(makeMockDelivery());
      await expect((service as any).createDelivery('milestone-1', dto))
        .rejects.toMatchObject({ code: ErrorCode.DELIVERY_ALREADY_EXISTS });
    });

    it('should reject when agreement is cancelled', async () => {
      prismaMock.milestone.findUnique.mockResolvedValue(
        makeMockMilestone({ agreement: { id: 'agreement-1', freelancerId: 'freelancer-1', status: 'CANCELLED' } }),
      );
      await expect((service as any).createDelivery('milestone-1', dto))
        .rejects.toMatchObject({ code: ErrorCode.AGREEMENT_NOT_ACTIVE });
    });
  });

  describe('updateDelivery', () => {
    const dto = { summary: 'Updated assets and fixed the mobile spacing issue.' };

    beforeEach(() => {
      prismaMock.delivery.findUnique.mockResolvedValue(makeMockDelivery());
      prismaMock.delivery.update.mockResolvedValue(makeMockDelivery({
        summary: dto.summary,
      }));
    });

    it('should update an editable draft delivery', async () => {
      const result = await (service as any).updateDelivery('delivery-1', dto);
      expect(result.summary).toBe(dto.summary);
    });

    it('should reject when delivery not found', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(null);
      await expect((service as any).updateDelivery('delivery-1', dto))
        .rejects.toMatchObject({ code: ErrorCode.DELIVERY_NOT_FOUND });
    });

    it('should reject when delivery is not editable (accepted)', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        makeMockDelivery({ status: DeliveryStatus.ACCEPTED }),
      );
      await expect((service as any).updateDelivery('delivery-1', dto))
        .rejects.toMatchObject({ code: ErrorCode.DELIVERY_NOT_EDITABLE });
    });

    it('should reject when delivery is disputed', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        makeMockDelivery({ status: DeliveryStatus.DISPUTED }),
      );
      await expect((service as any).updateDelivery('delivery-1', dto))
        .rejects.toMatchObject({ code: ErrorCode.DELIVERY_NOT_EDITABLE });
    });
  });
});
