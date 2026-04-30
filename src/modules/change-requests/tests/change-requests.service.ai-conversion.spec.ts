import { Test, TestingModule } from '@nestjs/testing';
import {
  AIRecommendation,
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
  makeMockAiReview,
} from './change-requests.service.test-utils';

describe('ChangeRequestsService — AI Review Conversion', () => {
  let service: ChangeRequestsService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let paymentsMock: ReturnType<typeof buildPaymentsServiceMock>;
  let timelineMock: ReturnType<typeof buildTimelineServiceMock>;
  let emailMock: ReturnType<typeof buildEmailServiceMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  const conversionOptions = {
    title: 'Extra work from AI review',
    description:
      'AI review identified out-of-scope work that needs a separate change request.',
    amount: '750.00',
    currency: 'USD',
    acceptanceCriteria: ['Feature implemented', 'Tests passing'],
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

  it('should create a change request from an eligible AI review (recommendation = PARTIAL)', async () => {
    const aiReview = makeMockAiReview({
      recommendation: AIRecommendation.PARTIAL,
    });
    const created = makeMockChangeRequest({
      status: ChangeRequestStatus.DRAFT,
    });

    prismaMock.aIReview.findUnique.mockResolvedValue(aiReview);
    prismaMock.changeRequest.create.mockResolvedValue(created);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    const result = await service.createFromAiReview(
      'ai-review-1',
      conversionOptions,
    );

    expect(result.id).toBe('cr-1');
    expect(result.status).toBe(ChangeRequestStatus.DRAFT);
  });

  it('should create a change request from an eligible AI review (recommendation = NEEDS_HUMAN_REVIEW)', async () => {
    const aiReview = makeMockAiReview({
      recommendation: AIRecommendation.NEEDS_HUMAN_REVIEW,
    });
    const created = makeMockChangeRequest({
      status: ChangeRequestStatus.DRAFT,
    });

    prismaMock.aIReview.findUnique.mockResolvedValue(aiReview);
    prismaMock.changeRequest.create.mockResolvedValue(created);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    const result = await service.createFromAiReview(
      'ai-review-1',
      conversionOptions,
    );

    expect(result.status).toBe(ChangeRequestStatus.DRAFT);
  });

  it('should emit CHANGE_REQUEST_CREATED timeline event with AI source metadata', async () => {
    const aiReview = makeMockAiReview({
      recommendation: AIRecommendation.PARTIAL,
    });
    const created = makeMockChangeRequest({
      status: ChangeRequestStatus.DRAFT,
    });

    prismaMock.aIReview.findUnique.mockResolvedValue(aiReview);
    prismaMock.changeRequest.create.mockResolvedValue(created);
    prismaMock.$transaction.mockImplementation(async (cb: Function) =>
      cb({
        changeRequest: prismaMock.changeRequest,
      }),
    );

    await service.createFromAiReview('ai-review-1', conversionOptions);

    expect(timelineMock.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TimelineEventType.CHANGE_REQUEST_CREATED,
        metadata: expect.objectContaining({
          aiReviewId: 'ai-review-1',
        }),
      }),
      expect.anything(),
    );
  });

  it('should throw AI_REVIEW_NOT_ELIGIBLE_FOR_CHANGE_REQUEST for non-PARTIAL/non-NEEDS_HUMAN_REVIEW recommendation', async () => {
    const aiReview = makeMockAiReview({
      recommendation: AIRecommendation.REJECT,
    });

    prismaMock.aIReview.findUnique.mockResolvedValue(aiReview);

    await expect(
      service.createFromAiReview('ai-review-1', conversionOptions),
    ).rejects.toMatchObject({
      code: ErrorCode.AI_REVIEW_NOT_ELIGIBLE_FOR_CHANGE_REQUEST,
    });
  });

  it('should throw AI_REVIEW_NOT_FOUND when aiReview.findUnique returns null', async () => {
    prismaMock.aIReview.findUnique.mockResolvedValue(null);

    await expect(
      service.createFromAiReview('nonexistent-review', conversionOptions),
    ).rejects.toMatchObject({ code: ErrorCode.AI_REVIEW_NOT_FOUND });
  });
});
