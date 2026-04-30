import { Test, TestingModule } from '@nestjs/testing';
import { ChangeRequestStatus, TimelineEventType } from '@prisma/client';
import { ChangeRequestsService } from '../change-requests.service';
import {
  buildPrismaMock,
  buildPaymentsServiceMock,
  buildTimelineServiceMock,
  buildEmailServiceMock,
  buildClsServiceMock,
  makeMockChangeRequest,
} from './change-requests.service.test-utils';

describe('ChangeRequestsService — Decline', () => {
  let service: ChangeRequestsService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let paymentsMock: ReturnType<typeof buildPaymentsServiceMock>;
  let timelineMock: ReturnType<typeof buildTimelineServiceMock>;
  let emailMock: ReturnType<typeof buildEmailServiceMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  const declineDto = {
    reason: 'The extra pages are not needed for this phase.',
  };

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

  it('should decline SENT → DECLINED and set declinedAt', async () => {
    const sent = makeMockChangeRequest({
      status: ChangeRequestStatus.SENT,
      payments: [],
      metadata: {},
    });
    const declined = makeMockChangeRequest({
      status: ChangeRequestStatus.DECLINED,
      declinedAt: new Date('2026-01-02'),
      payments: [],
      metadata: { declineReason: declineDto.reason },
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(sent);
    prismaMock.changeRequest.update.mockResolvedValue(declined);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    const result = await service.declineFromPortal('cr-1', declineDto);

    expect(result.status).toBe(ChangeRequestStatus.DECLINED);
    expect(result.declinedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('should store the decline reason on the change request record', async () => {
    const sent = makeMockChangeRequest({
      status: ChangeRequestStatus.SENT,
      payments: [],
      metadata: {},
    });
    const declined = makeMockChangeRequest({
      status: ChangeRequestStatus.DECLINED,
      declinedAt: new Date('2026-01-02'),
      payments: [],
      metadata: { declineReason: declineDto.reason },
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(sent);
    prismaMock.changeRequest.update.mockResolvedValue(declined);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    await service.declineFromPortal('cr-1', declineDto);

    expect(prismaMock.changeRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            declineReason: declineDto.reason,
          }),
        }),
      }),
    );
  });

  it('should NOT call paymentsService milestone-payment mock on decline', async () => {
    const sent = makeMockChangeRequest({
      status: ChangeRequestStatus.SENT,
      payments: [],
      metadata: {},
    });
    const declined = makeMockChangeRequest({
      status: ChangeRequestStatus.DECLINED,
      declinedAt: new Date('2026-01-02'),
      payments: [],
      metadata: { declineReason: declineDto.reason },
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(sent);
    prismaMock.changeRequest.update.mockResolvedValue(declined);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    await service.declineFromPortal('cr-1', declineDto);

    expect(paymentsMock.createPaymentForChangeRequest).not.toHaveBeenCalled();
    expect(paymentsMock.validateTransition).not.toHaveBeenCalled();
  });

  it('should emit CHANGE_REQUEST_DECLINED timeline event', async () => {
    const sent = makeMockChangeRequest({
      status: ChangeRequestStatus.SENT,
      payments: [],
      metadata: {},
    });
    const declined = makeMockChangeRequest({
      status: ChangeRequestStatus.DECLINED,
      declinedAt: new Date('2026-01-02'),
      payments: [],
      metadata: { declineReason: declineDto.reason },
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(sent);
    prismaMock.changeRequest.update.mockResolvedValue(declined);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    await service.declineFromPortal('cr-1', declineDto);

    expect(timelineMock.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TimelineEventType.CHANGE_REQUEST_DECLINED,
      }),
      expect.anything(),
    );
  });

  it('should send freelancer notification email after decline', async () => {
    const sent = makeMockChangeRequest({
      status: ChangeRequestStatus.SENT,
      payments: [],
      metadata: {},
    });
    const declined = makeMockChangeRequest({
      status: ChangeRequestStatus.DECLINED,
      declinedAt: new Date('2026-01-02'),
      payments: [],
      metadata: { declineReason: declineDto.reason },
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(sent);
    prismaMock.changeRequest.update.mockResolvedValue(declined);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    await service.declineFromPortal('cr-1', declineDto);

    expect(
      emailMock.enqueueChangeRequestDeclinedForFreelancer,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId: 'agreement-1',
        changeRequestId: 'cr-1',
      }),
    );
  });
});
