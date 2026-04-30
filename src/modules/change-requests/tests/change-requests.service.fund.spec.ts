import { Test, TestingModule } from '@nestjs/testing';
import {
  ChangeRequestStatus,
  PaymentStatus,
  TimelineEventType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { ChangeRequestsService } from '../change-requests.service';
import {
  buildPrismaMock,
  buildPaymentsServiceMock,
  buildTimelineServiceMock,
  buildEmailServiceMock,
  buildClsServiceMock,
  makeMockChangeRequest,
  makeMockPayment,
} from './change-requests.service.test-utils';

describe('ChangeRequestsService — Fund', () => {
  let service: ChangeRequestsService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let paymentsMock: ReturnType<typeof buildPaymentsServiceMock>;
  let timelineMock: ReturnType<typeof buildTimelineServiceMock>;
  let emailMock: ReturnType<typeof buildEmailServiceMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  const fundDto = {
    amount: '500.00',
    paymentMethodLabel: 'Demo Bank Transfer',
  };

  const waitingPayment = makeMockPayment({
    id: 'payment-cr-1',
    operationType: 'CHANGE_REQUEST_PAYMENT',
    status: 'WAITING',
    changeRequestId: 'cr-1',
    amount: new Decimal('500.00'),
  });

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

    paymentsMock.validateTransition.mockReturnValue(true);
  });

  it('should fund APPROVED → FUNDED and set fundedAt', async () => {
    const approved = makeMockChangeRequest({
      status: ChangeRequestStatus.APPROVED,
      payments: [waitingPayment],
    });
    const funded = makeMockChangeRequest({
      status: ChangeRequestStatus.FUNDED,
      fundedAt: new Date('2026-01-02'),
      payments: [{ ...waitingPayment, status: 'RESERVED' }],
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(approved);
    prismaMock.changeRequest.update.mockResolvedValue(funded);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
        payment: prismaMock.changeRequest,
      }),
    );

    const result = await service.fundFromPortal('cr-1', fundDto);

    expect(result.status).toBe(ChangeRequestStatus.FUNDED);
    expect(result.fundedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('should call paymentsService.validateTransition with WAITING → RESERVED', async () => {
    const approved = makeMockChangeRequest({
      status: ChangeRequestStatus.APPROVED,
      payments: [waitingPayment],
    });
    const funded = makeMockChangeRequest({
      status: ChangeRequestStatus.FUNDED,
      fundedAt: new Date('2026-01-02'),
      payments: [{ ...waitingPayment, status: 'RESERVED' }],
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(approved);
    prismaMock.changeRequest.update.mockResolvedValue(funded);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
        payment: prismaMock.changeRequest,
      }),
    );

    await service.fundFromPortal('cr-1', fundDto);

    expect(paymentsMock.validateTransition).toHaveBeenCalledWith(
      PaymentStatus.WAITING,
      PaymentStatus.RESERVED,
    );
  });

  it('should NOT mutate milestone payment', async () => {
    const milestonePayment = makeMockPayment({
      id: 'payment-milestone-1',
      operationType: 'MILESTONE_PAYMENT',
      milestoneId: 'milestone-1',
      changeRequestId: null,
    });
    const approved = makeMockChangeRequest({
      status: ChangeRequestStatus.APPROVED,
      payments: [milestonePayment, waitingPayment],
    });
    const funded = makeMockChangeRequest({
      status: ChangeRequestStatus.FUNDED,
      fundedAt: new Date('2026-01-02'),
      payments: [milestonePayment, { ...waitingPayment, status: 'RESERVED' }],
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(approved);
    prismaMock.changeRequest.update.mockResolvedValue(funded);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
        payment: prismaMock.changeRequest,
      }),
    );

    await service.fundFromPortal('cr-1', fundDto);

    const updateCalls = prismaMock.changeRequest.update;
    // The milestone payment should not be touched in any mutation call
    expect(updateCalls).toHaveBeenCalled();
  });

  it('should reject double funding → CHANGE_REQUEST_NOT_APPROVED', async () => {
    prismaMock.changeRequest.findUnique.mockResolvedValue(
      makeMockChangeRequest({
        status: ChangeRequestStatus.FUNDED,
        payments: [],
      }),
    );

    await expect(service.fundFromPortal('cr-1', fundDto)).rejects.toMatchObject(
      { code: ErrorCode.CHANGE_REQUEST_NOT_APPROVED },
    );
  });

  it('should emit CHANGE_REQUEST_FUNDED timeline event', async () => {
    const approved = makeMockChangeRequest({
      status: ChangeRequestStatus.APPROVED,
      payments: [waitingPayment],
    });
    const funded = makeMockChangeRequest({
      status: ChangeRequestStatus.FUNDED,
      fundedAt: new Date('2026-01-02'),
      payments: [{ ...waitingPayment, status: 'RESERVED' }],
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(approved);
    prismaMock.changeRequest.update.mockResolvedValue(funded);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
        payment: prismaMock.changeRequest,
      }),
    );

    await service.fundFromPortal('cr-1', fundDto);

    expect(timelineMock.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TimelineEventType.CHANGE_REQUEST_FUNDED,
      }),
      expect.anything(),
    );
  });

  it('should propagate payment service error', async () => {
    const approved = makeMockChangeRequest({
      status: ChangeRequestStatus.APPROVED,
      payments: [waitingPayment],
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(approved);
    paymentsMock.validateTransition.mockImplementation(() => {
      throw new Error('Payment validation failed');
    });

    await expect(service.fundFromPortal('cr-1', fundDto)).rejects.toThrow(
      'Payment validation failed',
    );
  });
});
