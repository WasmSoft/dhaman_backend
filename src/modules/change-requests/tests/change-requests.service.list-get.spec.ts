import { Test, TestingModule } from '@nestjs/testing';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { ChangeRequestsService } from '../change-requests.service';
import {
  buildPrismaMock,
  buildPaymentsServiceMock,
  buildTimelineServiceMock,
  buildEmailServiceMock,
  buildClsServiceMock,
  makeMockChangeRequest,
  makeMockAgreement,
} from './change-requests.service.test-utils';

describe('ChangeRequestsService — List / GetById', () => {
  let service: ChangeRequestsService;
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
        ChangeRequestsService,
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

    service = module.get<ChangeRequestsService>(ChangeRequestsService);
  });

  describe('list()', () => {
    const mockCr = makeMockChangeRequest();

    it('should return paginated result for valid userId and owned agreement', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(makeMockAgreement());
      prismaMock.changeRequest.findMany.mockResolvedValue([mockCr]);
      prismaMock.changeRequest.count.mockResolvedValue(1);
      prismaMock.$transaction.mockImplementation((arg: unknown) => {
        if (typeof arg === 'function') return arg({});
        if (Array.isArray(arg)) return Promise.all(arg);
        return Promise.resolve(arg);
      });

      const result = await service.list('agreement-1', {}, 'freelancer-1');

      expect(result.total).toBe(1);
      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe('cr-1');
    });

    it('should throw AGREEMENT_NOT_FOUND when agreement not owned', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(null);

      await expect(
        service.list('agreement-1', {}, 'freelancer-1'),
      ).rejects.toMatchObject({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    });

    it('should throw UNAUTHORIZED when userId is undefined', async () => {
      clsMock.get.mockReturnValue(undefined);

      await expect(service.list('agreement-1', {})).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
      });
    });
  });

  describe('getById()', () => {
    it('should return change request detail for owned resource', async () => {
      const cr = makeMockChangeRequest();
      cr.agreement.freelancerId = 'freelancer-1';

      prismaMock.changeRequest.findUnique.mockResolvedValue(cr);

      const result = await service.getById('cr-1', 'freelancer-1');

      expect(result.id).toBe('cr-1');
      expect(result.status).toBe('DRAFT');
    });

    it('should throw CHANGE_REQUEST_NOT_FOUND when findUnique returns null', async () => {
      prismaMock.changeRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.getById('cr-1', 'freelancer-1'),
      ).rejects.toMatchObject({ code: ErrorCode.CHANGE_REQUEST_NOT_FOUND });
    });

    it('should throw CHANGE_REQUEST_NOT_FOUND when change request belongs to a different freelancer', async () => {
      const cr = makeMockChangeRequest();
      cr.agreement.freelancerId = 'other-freelancer';

      prismaMock.changeRequest.findUnique.mockResolvedValue(cr);

      await expect(
        service.getById('cr-1', 'freelancer-1'),
      ).rejects.toMatchObject({ code: ErrorCode.CHANGE_REQUEST_NOT_FOUND });
    });
  });
});
