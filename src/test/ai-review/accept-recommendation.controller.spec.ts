import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from '../../common/cls/cls.service';
import { AiReviewController } from '../../modules/ai-review/ai-review.controller';
import { AiReviewService } from '../../modules/ai-review/ai-review.service';

describe('AiReviewController acceptRecommendation', () => {
  let controller: AiReviewController;
  let service: AiReviewService;
  let clsService: ClsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiReviewController],
      providers: [
        {
          provide: AiReviewService,
          useValue: {
            acceptRecommendation: jest.fn(),
          },
        },
        {
          provide: ClsService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AiReviewController>(AiReviewController);
    service = module.get<AiReviewService>(AiReviewService);
    clsService = module.get<ClsService>(ClsService);
  });

  it('POST /api/v1/ai-reviews/:id/accept-recommendation with valid JWT and ACCEPT review returns 200', async () => {
    const mockResponse = {
      review: { id: 'review-1', status: 'COMPLETED', recommendation: 'ACCEPT' },
      paymentStatus: 'READY_TO_RELEASE',
      changeRequestsCreated: 0,
    };
    jest
      .spyOn(service, 'acceptRecommendation')
      .mockResolvedValue(mockResponse as never);
    jest.spyOn(clsService, 'get').mockReturnValue('freelancer-1');

    const result = await controller.acceptRecommendation('review-1', {
      createChangeRequests: false,
    });

    expect(result).toEqual(mockResponse);
    expect(service.acceptRecommendation).toHaveBeenCalledWith(
      'review-1',
      { createChangeRequests: false },
      'freelancer-1',
    );
  });

  it('POST /api/v1/ai-reviews/:id/accept-recommendation without JWT returns 401 via guard', () => {
    // JwtAuthGuard is applied via @UseGuards; e2e test would verify 401.
    // Controller unit test verifies the guard decorator is present.
    const guards = Reflect.getMetadata(
      '__guards__',
      AiReviewController.prototype.acceptRecommendation,
    );
    expect(guards).toBeDefined();
  });

  it('POST /api/v1/ai-reviews/:id/accept-recommendation on non-existent review returns 404', async () => {
    jest
      .spyOn(service, 'acceptRecommendation')
      .mockRejectedValue({ code: 'AI_REVIEW_NOT_FOUND', status: 404 });
    jest.spyOn(clsService, 'get').mockReturnValue('freelancer-1');

    await expect(
      controller.acceptRecommendation('review-1', {
        createChangeRequests: false,
      }),
    ).rejects.toMatchObject({ code: 'AI_REVIEW_NOT_FOUND' });
  });

  it('POST /api/v1/ai-reviews/:id/accept-recommendation on already-accepted review returns 409', async () => {
    jest
      .spyOn(service, 'acceptRecommendation')
      .mockRejectedValue({ code: 'AI_REVIEW_ALREADY_COMPLETED', status: 409 });
    jest.spyOn(clsService, 'get').mockReturnValue('freelancer-1');

    await expect(
      controller.acceptRecommendation('review-1', {
        createChangeRequests: false,
      }),
    ).rejects.toMatchObject({ code: 'AI_REVIEW_ALREADY_COMPLETED' });
  });
});
