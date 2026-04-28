import { Module } from '@nestjs/common';
import { AiReviewController } from './ai-review.controller';
import { AiReviewService } from './ai-review.service';

@Module({
  controllers: [AiReviewController],
  providers: [AiReviewService],
})
export class AiReviewModule {}
