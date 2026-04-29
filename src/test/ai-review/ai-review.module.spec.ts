import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AiReviewController } from '../../modules/ai-review/ai-review.controller';
import { AiReviewModule } from '../../modules/ai-review/ai-review.module';
import { AiReviewService } from '../../modules/ai-review/ai-review.service';
import { GeminiService } from '../../modules/ai-review/gemini.service';

describe('AiReviewModule', () => {
  it('compiles and resolves the controller, service, and GeminiService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true }), AiReviewModule],
    }).compile();

    expect(moduleRef.get(AiReviewService)).toBeInstanceOf(AiReviewService);
    expect(moduleRef.get(AiReviewController)).toBeInstanceOf(
      AiReviewController,
    );
    expect(moduleRef.get(GeminiService)).toBeInstanceOf(GeminiService);
  });
});
