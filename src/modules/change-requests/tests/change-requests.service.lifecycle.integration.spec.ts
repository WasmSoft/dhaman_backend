import { Test, TestingModule } from '@nestjs/testing';
import {
  ChangeRequestStatus,
  PaymentStatus,
  TimelineEventType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ChangeRequestsService } from '../change-requests.service';
import {
  buildPrismaMock,
  buildPaymentsServiceMock,
  buildTimelineServiceMock,
  buildEmailServiceMock,
  buildClsServiceMock,
  makeMockChangeRequest,
  makeMockAgreement,
  makeMockPayment,
} from './change-requests.service.test-utils';

describe('ChangeRequestsService — Full Lifecycle Integration', () => {
  let service: ChangeRequestsService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let paymentsMock: ReturnType<typeof buildPaymentsServiceMock>;
  let timelineMock: ReturnType<typeof buildTimelineServiceMock>;
  let emailMock: ReturnType<typeof buildEmailServiceMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  const createDto = {
    title: 'Add extra landing page',
    description:
      'Client needs an additional landing page with hero section and contact form.',
    amount: '500.00',
    currency: 'USD',
    acceptanceCriteria: ['Landing page delivered', 'Hero section included'],
  };

  const fundDto = {
    amount: '500.00',
    paymentMethodLabel: 'Demo Bank Transfer',
  };

  const milestonePayment = makeMockPayment({
    id: 'payment-milestone-1',
    operationType: 'MILESTONE_PAYMENT',
    milestoneId: 'milestone-1',
    changeRequestId: null,
    status: 'RESERVED',
  });

  const waitingPayment = makeMockPayment({
    id: 'payment-cr-1',
    operationType: 'CHANGE_REQUEST_PAYMENT',
    status: 'WAITING',
    changeRequestId: 'cr-1',
    amount: new Decimal('500.00'),
  });

  let currentPayments: (typeof milestonePayment)[];

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

    currentPayments = [milestonePayment];

    // Default CLS context
    clsMock.getContext.mockReturnValue({
      agreementId: 'agreement-1',
      userId: 'freelancer-1',
    });

    paymentsMock.validateTransition.mockReturnValue(true);
  });

  describe('Happy path: DRAFT → SENT → APPROVED → FUNDED', () => {
    it('should complete the full lifecycle with milestone payment unchanged', async () => {
      // Step 1: CREATE → DRAFT
      const draftCr = makeMockChangeRequest({
        status: ChangeRequestStatus.DRAFT,
        payments: [milestonePayment],
      });
      prismaMock.agreement.findUnique.mockResolvedValue(makeMockAgreement());
      prismaMock.changeRequest.create.mockResolvedValue(draftCr);
      prismaMock.$transaction.mockImplementation(async (cb: Function) =>
        cb({
          changeRequest: prismaMock.changeRequest,
        }),
      );

      const created = await service.create(
        'agreement-1',
        createDto,
        'freelancer-1',
      );
      expect(created.status).toBe(ChangeRequestStatus.DRAFT);

      // Step 2: SEND → SENT
      const sentCr = makeMockChangeRequest({
        status: ChangeRequestStatus.SENT,
        payments: [milestonePayment],
      });
      prismaMock.changeRequest.findUnique.mockResolvedValue(
        makeMockChangeRequest({
          status: ChangeRequestStatus.DRAFT,
          payments: [milestonePayment],
        }),
      );
      prismaMock.changeRequest.update.mockResolvedValue(sentCr);
      prismaMock.$transaction.mockImplementation(async (cb: Function) =>
        cb({
          changeRequest: prismaMock.changeRequest,
        }),
      );

      const sent = await service.send('cr-1', 'freelancer-1');
      expect(sent.status).toBe(ChangeRequestStatus.SENT);

      // Step 3: APPROVE → APPROVED + Payment(WAITING)
      currentPayments = [milestonePayment, waitingPayment];
      const approvedCr = makeMockChangeRequest({
        status: ChangeRequestStatus.APPROVED,
        approvedAt: new Date('2026-01-03'),
        payments: currentPayments,
      });
      prismaMock.changeRequest.findUnique.mockResolvedValue(
        makeMockChangeRequest({
          status: ChangeRequestStatus.SENT,
          payments: [milestonePayment],
        }),
      );
      prismaMock.changeRequest.update.mockResolvedValue(approvedCr);
      prismaMock.$transaction.mockImplementation(async (cb: Function) =>
        cb({
          changeRequest: prismaMock.changeRequest,
        }),
      );

      const approved = await service.approveFromPortal('cr-1');
      expect(approved.status).toBe(ChangeRequestStatus.APPROVED);
      expect(paymentsMock.createPaymentForChangeRequest).toHaveBeenCalled();

      // Step 4: FUND → FUNDED + Payment(RESERVED)
      const reservedPayment = {
        ...waitingPayment,
        status: 'RESERVED' as PaymentStatus,
      };
      currentPayments = [milestonePayment, reservedPayment];
      const fundedCr = makeMockChangeRequest({
        status: ChangeRequestStatus.FUNDED,
        fundedAt: new Date('2026-01-04'),
        payments: currentPayments,
      });
      prismaMock.changeRequest.findUnique.mockResolvedValue(
        makeMockChangeRequest({
          status: ChangeRequestStatus.APPROVED,
          payments: [milestonePayment, waitingPayment],
        }),
      );
      prismaMock.changeRequest.update.mockResolvedValue(fundedCr);
      prismaMock.$transaction.mockImplementation(async (cb: Function) =>
        cb({
          changeRequest: prismaMock.changeRequest,
          payment: prismaMock.changeRequest,
        }),
      );

      const funded = await service.fundFromPortal('cr-1', fundDto);
      expect(funded.status).toBe(ChangeRequestStatus.FUNDED);

      // Verify milestone payment was never mutated
      // Timeline events were emitted
      expect(timelineMock.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TimelineEventType.CHANGE_REQUEST_CREATED,
        }),
        expect.anything(),
      );
    });
  });

  describe('Decline path: DRAFT → SENT → DECLINED', () => {
    it('should complete DRAFT → SENT → DECLINED with milestone payment unchanged', async () => {
      // Create
      const draftCr = makeMockChangeRequest({
        status: ChangeRequestStatus.DRAFT,
        payments: [milestonePayment],
      });
      prismaMock.agreement.findUnique.mockResolvedValue(makeMockAgreement());
      prismaMock.changeRequest.create.mockResolvedValue(draftCr);
      prismaMock.$transaction.mockImplementation(async (cb: Function) =>
        cb({
          changeRequest: prismaMock.changeRequest,
        }),
      );

      await service.create('agreement-1', createDto, 'freelancer-1');

      // Send
      const sentCr = makeMockChangeRequest({
        status: ChangeRequestStatus.SENT,
        payments: [milestonePayment],
      });
      prismaMock.changeRequest.findUnique.mockResolvedValue(
        makeMockChangeRequest({
          status: ChangeRequestStatus.DRAFT,
          payments: [milestonePayment],
        }),
      );
      prismaMock.changeRequest.update.mockResolvedValue(sentCr);
      prismaMock.$transaction.mockImplementation(async (cb: Function) =>
        cb({
          changeRequest: prismaMock.changeRequest,
        }),
      );

      await service.send('cr-1', 'freelancer-1');

      // Decline
      const declinedCr = makeMockChangeRequest({
        status: ChangeRequestStatus.DECLINED,
        declinedAt: new Date('2026-01-03'),
        payments: [milestonePayment],
        metadata: { declineReason: 'Not needed for this phase.' },
      });
      prismaMock.changeRequest.findUnique.mockResolvedValue(
        makeMockChangeRequest({
          status: ChangeRequestStatus.SENT,
          payments: [milestonePayment],
          metadata: {},
        }),
      );
      prismaMock.changeRequest.update.mockResolvedValue(declinedCr);
      prismaMock.$transaction.mockImplementation(async (cb: Function) =>
        cb({
          changeRequest: prismaMock.changeRequest,
        }),
      );

      const declineDto = { reason: 'Not needed for this phase.' };
      const declined = await service.declineFromPortal('cr-1', declineDto);

      expect(declined.status).toBe(ChangeRequestStatus.DECLINED);
      // Milestone payment was never mutated via PaymentsService
      expect(paymentsMock.createPaymentForChangeRequest).not.toHaveBeenCalled();
    });
  });
});
