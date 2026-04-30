import { Test, TestingModule } from '@nestjs/testing';
import {
  ChangeRequestStatus,
  TimelineEventType,
} from '@prisma/client';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { ChangeRequestsService } from '../change-requests.service';
import {
  buildPrismaMock,
  buildPaymentsServiceMock,
  buildTimelineServiceMock,
  buildEmailServiceMock,
  buildClsServiceMock,
  makeMockChangeRequest,
} from './change-requests.service.test-utils';

describe('ChangeRequestsService — Approve', () => {
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

    clsMock.getContext.mockReturnValue({
      agreementId: 'agreement-1',
    });
  });

  it('should approve SENT → APPROVED and set approvedAt', async () => {
    const sent = makeMockChangeRequest({
      status: ChangeRequestStatus.SENT,
      payments: [],
    });
    const approved = makeMockChangeRequest({
      status: ChangeRequestStatus.APPROVED,
      approvedAt: new Date('2026-01-02'),
      payments: [],
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(sent);
    prismaMock.changeRequest.update.mockResolvedValue(approved);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    const result = await service.approveFromPortal('cr-1');

    expect(result.status).toBe(ChangeRequestStatus.APPROVED);
    expect(result.approvedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('should create a separate CHANGE_REQUEST_PAYMENT payment on approve', async () => {
    const sent = makeMockChangeRequest({
      status: ChangeRequestStatus.SENT,
      payments: [],
    });
    const approved = makeMockChangeRequest({
      status: ChangeRequestStatus.APPROVED,
      approvedAt: new Date('2026-01-02'),
      payments: [],
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(sent);
    prismaMock.changeRequest.update.mockResolvedValue(approved);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    await service.approveFromPortal('cr-1');

    expect(paymentsMock.createPaymentForChangeRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        changeRequestId: 'cr-1',
        agreementId: 'agreement-1',
      }),
    );
  });

  it('should emit CHANGE_REQUEST_APPROVED timeline event', async () => {
    const sent = makeMockChangeRequest({
      status: ChangeRequestStatus.SENT,
      payments: [],
    });
    const approved = makeMockChangeRequest({
      status: ChangeRequestStatus.APPROVED,
      approvedAt: new Date('2026-01-02'),
      payments: [],
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(sent);
    prismaMock.changeRequest.update.mockResolvedValue(approved);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    await service.approveFromPortal('cr-1');

    expect(timelineMock.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TimelineEventType.CHANGE_REQUEST_APPROVED,
      }),
      expect.anything(),
    );
  });

  it('should send freelancer notification email after approve', async () => {
    const sent = makeMockChangeRequest({
      status: ChangeRequestStatus.SENT,
      payments: [],
    });
    const approved = makeMockChangeRequest({
      status: ChangeRequestStatus.APPROVED,
      approvedAt: new Date('2026-01-02'),
      payments: [],
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(sent);
    prismaMock.changeRequest.update.mockResolvedValue(approved);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    await service.approveFromPortal('cr-1');

    expect(
      emailMock.enqueueChangeRequestApprovedForFreelancer,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId: 'agreement-1',
        changeRequestId: 'cr-1',
      }),
    );
  });

  it('should throw CHANGE_REQUEST_NOT_APPROVABLE when already APPROVED', async () => {
    prismaMock.changeRequest.findUnique.mockResolvedValue(
      makeMockChangeRequest({
        status: ChangeRequestStatus.APPROVED,
        payments: [],
      }),
    );

    await expect(service.approveFromPortal('cr-1')).rejects.toMatchObject({
      code: ErrorCode.CHANGE_REQUEST_NOT_APPROVABLE,
    });
  });
});
