import { Test, TestingModule } from '@nestjs/testing';
import { ChangeRequestStatus, TimelineEventType } from '@prisma/client';
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
  makeMockAiReview,
} from './change-requests.service.test-utils';

describe('ChangeRequestsService — Create', () => {
  let service: ChangeRequestsService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let paymentsMock: ReturnType<typeof buildPaymentsServiceMock>;
  let timelineMock: ReturnType<typeof buildTimelineServiceMock>;
  let emailMock: ReturnType<typeof buildEmailServiceMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  const validDto = {
    title: 'Add extra landing page',
    description:
      'Client needs an additional landing page with hero section and contact form.',
    amount: '500.00',
    currency: 'USD',
    acceptanceCriteria: ['Landing page delivered', 'Hero section included'],
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
  });

  it('should throw AGREEMENT_NOT_FOUND when agreement not owned', async () => {
    prismaMock.agreement.findUnique.mockResolvedValue(null);

    await expect(
      service.create('agreement-1', validDto, 'freelancer-1'),
    ).rejects.toMatchObject({ code: ErrorCode.AGREEMENT_NOT_FOUND });
  });

  it('should throw CHANGE_REQUEST_AMOUNT_INVALID when amount is zero', async () => {
    prismaMock.agreement.findUnique.mockResolvedValue(makeMockAgreement());

    await expect(
      service.create(
        'agreement-1',
        { ...validDto, amount: '0.00' },
        'freelancer-1',
      ),
    ).rejects.toMatchObject({ code: ErrorCode.CHANGE_REQUEST_AMOUNT_INVALID });
  });

  it('should throw CHANGE_REQUEST_AMOUNT_INVALID when amount is negative', async () => {
    prismaMock.agreement.findUnique.mockResolvedValue(makeMockAgreement());

    await expect(
      service.create(
        'agreement-1',
        { ...validDto, amount: '-10.00' },
        'freelancer-1',
      ),
    ).rejects.toMatchObject({ code: ErrorCode.CHANGE_REQUEST_AMOUNT_INVALID });
  });

  it('should create a DRAFT change request with correct fields', async () => {
    const created = makeMockChangeRequest({
      status: ChangeRequestStatus.DRAFT,
    });
    prismaMock.agreement.findUnique.mockResolvedValue(makeMockAgreement());
    prismaMock.changeRequest.create.mockResolvedValue(created);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    const result = await service.create(
      'agreement-1',
      validDto,
      'freelancer-1',
    );

    expect(result.status).toBe(ChangeRequestStatus.DRAFT);
    expect(result.amount).toBe('500');
    expect(prismaMock.changeRequest.create).toHaveBeenCalled();
  });

  it('should emit CHANGE_REQUEST_CREATED timeline event on valid create', async () => {
    const created = makeMockChangeRequest({
      status: ChangeRequestStatus.DRAFT,
    });
    prismaMock.agreement.findUnique.mockResolvedValue(makeMockAgreement());
    prismaMock.changeRequest.create.mockResolvedValue(created);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    await service.create('agreement-1', validDto, 'freelancer-1');

    expect(timelineMock.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TimelineEventType.CHANGE_REQUEST_CREATED,
      }),
      expect.anything(),
    );
  });

  it('should throw AI_REVIEW_NOT_FOUND when aiReviewId does not exist', async () => {
    prismaMock.agreement.findUnique.mockResolvedValue(makeMockAgreement());
    prismaMock.aIReview.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        'agreement-1',
        {
          ...validDto,
          aiReviewId: 'nonexistent-review',
        },
        'freelancer-1',
      ),
    ).rejects.toMatchObject({ code: ErrorCode.AI_REVIEW_NOT_FOUND });
  });

  it('should throw AGREEMENT_NOT_FOUND when AI review belongs to a different agreement', async () => {
    prismaMock.agreement.findUnique.mockResolvedValue(makeMockAgreement());
    prismaMock.aIReview.findUnique.mockResolvedValue(
      makeMockAiReview({ agreementId: 'other-agreement' }),
    );

    await expect(
      service.create(
        'agreement-1',
        {
          ...validDto,
          aiReviewId: 'ai-review-1',
        },
        'freelancer-1',
      ),
    ).rejects.toMatchObject({ code: ErrorCode.AGREEMENT_NOT_FOUND });
  });

  it('should throw UNAUTHORIZED when userId is missing from CLS context and not passed', async () => {
    clsMock.get.mockReturnValue(undefined);

    await expect(service.create('agreement-1', validDto)).rejects.toMatchObject(
      { code: ErrorCode.UNAUTHORIZED },
    );
  });
});
