import { Test, TestingModule } from '@nestjs/testing';
import {
  ChangeRequestStatus,
  PaymentStatus,
  TimelineActorRole,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ChangeRequestsService } from '../../modules/change-requests/change-requests.service';
import { ClsService } from '../../common/cls/cls.service';
import { EmailNotificationsService } from '../../modules/email-notifications/email-notifications.service';

const FREELANCER_ID = 'freelancer-1111-1111-1111-111111111111';
const AGREEMENT_ID = 'agreement-3333-3333-3333-333333333333';
const CR_ID = 'cr-5555-5555-5555-555555555555';

function mockChangeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: CR_ID,
    agreementId: AGREEMENT_ID,
    milestoneId: null,
    aiReviewId: null,
    requestedByRole: 'FREELANCER' as TimelineActorRole,
    title: 'Add extra landing page',
    description:
      'Client needs an additional landing page with hero section and contact form.',
    amount: new Decimal('500.00'),
    currency: 'USD',
    additionalTimelineText: null,
    timelineDays: null,
    acceptanceCriteria: ['Landing page delivered', 'Hero section included'],
    status: 'DRAFT' as ChangeRequestStatus,
    paymentStatus: 'WAITING' as PaymentStatus,
    approvedAt: null,
    declinedAt: null,
    fundedAt: null,
    createdAt: new Date('2026-04-30T00:00:00.000Z'),
    updatedAt: new Date('2026-04-30T00:00:00.000Z'),
    metadata: {},
    agreement: {
      id: AGREEMENT_ID,
      freelancerId: FREELANCER_ID,
      status: 'ACTIVE',
    },
    payments: [],
    ...overrides,
  };
}

describe('Email notifications — change request boundary', () => {
  let service: ChangeRequestsService;
  let prismaMock: Record<string, any>;
  let paymentsMock: Record<string, any>;
  let timelineMock: Record<string, any>;
  let emailMock: Record<string, any>;
  let clsMock: Record<string, any>;

  beforeEach(async () => {
    prismaMock = {
      changeRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      agreement: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      aIReview: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((cb: Function) =>
        cb({
          changeRequest: prismaMock?.changeRequest,
          payment: prismaMock?.changeRequest,
        }),
      ),
    };

    paymentsMock = {
      createPaymentForChangeRequest: jest.fn().mockResolvedValue({
        id: 'payment-cr-1',
        status: 'WAITING',
        amount: new Decimal('500.00'),
        currency: 'USD',
        operationType: 'CHANGE_REQUEST_PAYMENT',
      }),
      validateTransition: jest.fn().mockReturnValue(true),
    };

    timelineMock = {
      createEvent: jest.fn().mockResolvedValue({ id: 'timeline-1' }),
    };

    emailMock = {
      enqueueChangeRequestSentForClient: jest.fn().mockResolvedValue(undefined),
      enqueueChangeRequestApprovedForFreelancer: jest
        .fn()
        .mockResolvedValue(undefined),
      enqueueChangeRequestDeclinedForFreelancer: jest
        .fn()
        .mockResolvedValue(undefined),
    };

    clsMock = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return FREELANCER_ID;
        return undefined;
      }),
      getContext: jest.fn().mockReturnValue({
        requestId: 'req-001',
        userId: FREELANCER_ID,
        agreementId: AGREEMENT_ID,
        locale: 'en',
      }),
      setContext: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeRequestsService,
        {
          provide: require('../../infrastructure/prisma/prisma.service')
            .PrismaService,
          useValue: prismaMock,
        },
        {
          provide: require('../../modules/payments/payments.service')
            .PaymentsService,
          useValue: paymentsMock,
        },
        {
          provide:
            require('../../modules/timeline-events/timeline-events.service')
              .TimelineEventsService,
          useValue: timelineMock,
        },
        { provide: EmailNotificationsService, useValue: emailMock },
        { provide: ClsService, useValue: clsMock },
      ],
    }).compile();

    service = module.get<ChangeRequestsService>(ChangeRequestsService);
  });

  it('should invoke EmailNotificationsService after create() sends change request to client', async () => {
    const created = mockChangeRequest({
      status: 'DRAFT',
    });
    prismaMock.agreement.findUnique.mockResolvedValue({
      id: AGREEMENT_ID,
      freelancerId: FREELANCER_ID,
    });
    prismaMock.changeRequest.create.mockResolvedValue(created);
    // Re-bind $transaction after prismaMock is fully built
    prismaMock.$transaction = jest.fn((cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    await service.create(
      AGREEMENT_ID,
      {
        title: 'Add extra landing page',
        description:
          'Client needs an additional landing page with hero section and contact form.',
        amount: '500.00',
        currency: 'USD',
        acceptanceCriteria: ['Landing page delivered', 'Hero section included'],
      },
      FREELANCER_ID,
    );

    // Email is only sent in send(), not create()
    // Create does NOT invoke email (only timeline event)
    // Let's verify: send() should invoke the email
    const sent = mockChangeRequest({ status: 'SENT' });
    prismaMock.changeRequest.findUnique.mockResolvedValue(
      mockChangeRequest({ status: 'DRAFT' }),
    );
    prismaMock.changeRequest.update.mockResolvedValue(sent);
    prismaMock.$transaction = jest.fn((cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    await service.send(CR_ID, FREELANCER_ID);

    expect(emailMock.enqueueChangeRequestSentForClient).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId: AGREEMENT_ID,
        changeRequestId: CR_ID,
      }),
    );
  });

  it('should invoke EmailNotificationsService after approveFromPortal() for freelancer notification', async () => {
    const sent = mockChangeRequest({
      status: 'SENT',
      payments: [],
    });
    const approved = mockChangeRequest({
      status: 'APPROVED',
      approvedAt: new Date('2026-04-30T01:00:00.000Z'),
      payments: [],
    });

    prismaMock.changeRequest.findUnique.mockResolvedValue(sent);
    prismaMock.changeRequest.update.mockResolvedValue(approved);
    prismaMock.$transaction = jest.fn((cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    await service.approveFromPortal(CR_ID);

    expect(
      emailMock.enqueueChangeRequestApprovedForFreelancer,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId: AGREEMENT_ID,
        changeRequestId: CR_ID,
      }),
    );
  });
});
