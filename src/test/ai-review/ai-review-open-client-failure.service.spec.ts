import { AIReviewStatus, TimelineActorRole } from '@prisma/client';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { Locale } from '../../common/enums/locale.enum';
import * as helpers from '../../modules/ai-review/helpers';
import {
  createDeliveryFixture,
  createGeminiServiceMock,
  createReviewRecord,
  createService,
  REVIEW_OBJECTION,
} from './ai-review-service-test-helpers';

describe('AiReviewService openReview client failure', () => {
  it('falls back to mock and completes the review when Gemini fails twice', async () => {
    const geminiService = createGeminiServiceMock();
    (geminiService.generateContent as jest.Mock).mockRejectedValue(
      new Error('Network error'),
    );

    const { service, prisma } = createService(Locale.EN, geminiService);

    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(
      createDeliveryFixture(),
    );
    (prisma.aIReview.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: 'CLIENT_REVIEW',
    });
    (prisma.aIReview.create as jest.Mock).mockResolvedValue(
      createReviewRecord(),
    );
    (prisma.aIReview.update as jest.Mock)
      .mockResolvedValueOnce(
        createReviewRecord({ status: AIReviewStatus.PROCESSING }),
      )
      .mockImplementationOnce(({ data }) =>
        Promise.resolve(
          createReviewRecord({
            ...data,
            status: AIReviewStatus.COMPLETED,
            recommendation: data.recommendation,
          }),
        ),
      );

    const result = await service.openReview(
      'delivery-1',
      { objection: REVIEW_OBJECTION },
      TimelineActorRole.CLIENT,
    );

    expect(result.status).toBe(AIReviewStatus.COMPLETED);
    expect(result.matchScore).toBe(72);
    expect(geminiService.generateContent).toHaveBeenCalledTimes(2);

    const completionUpdate = (prisma.aIReview.update as jest.Mock).mock
      .calls[1][0].data;
    expect(completionUpdate.rawResponse).toEqual({
      provider: 'mock',
      reason: 'ai_failure',
      response: expect.objectContaining({
        matchScore: 72,
        recommendation: 'PARTIAL',
      }),
    });
  });

  it('marks the review FAILED and throws AI_REVIEW_FAILED when mock generation fails', async () => {
    const geminiService = createGeminiServiceMock();
    (geminiService.generateContent as jest.Mock).mockRejectedValue(
      new Error('AI service unavailable'),
    );

    const { service, prisma } = createService(Locale.EN, geminiService);

    const generateMockReviewSpy = jest
      .spyOn(helpers, 'generateMockReview')
      .mockImplementation(() => {
        throw new Error('mock provider failed');
      });

    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(
      createDeliveryFixture(),
    );
    (prisma.aIReview.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: 'CLIENT_REVIEW',
    });
    (prisma.aIReview.create as jest.Mock).mockResolvedValue(
      createReviewRecord(),
    );
    (prisma.aIReview.update as jest.Mock)
      .mockResolvedValueOnce(
        createReviewRecord({ status: AIReviewStatus.PROCESSING }),
      )
      .mockResolvedValueOnce(
        createReviewRecord({
          status: AIReviewStatus.FAILED,
          rawResponse: { provider: 'mock', error: 'Error' },
        }),
      );

    await expect(
      service.openReview(
        'delivery-1',
        { objection: REVIEW_OBJECTION },
        TimelineActorRole.CLIENT,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.AI_REVIEW_FAILED });

    expect((prisma.aIReview.update as jest.Mock).mock.calls[1][0].data).toEqual(
      expect.objectContaining({ status: AIReviewStatus.FAILED }),
    );

    generateMockReviewSpy.mockRestore();
  });
});
