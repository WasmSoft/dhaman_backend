import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from '../../common/cls/cls.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { TimelineEventsModule } from '../timeline-events/timeline-events.module';
import { AiReviewController } from './ai-review.controller';
import { AiReviewService } from './ai-review.service';
import { GeminiService } from './gemini.service';

/**
 * AR: تجمع وحدة مراجعة الذكاء الاصطناعي خدمة التدفق الأساسي وواجهة DTO العامة.
 * EN: The AI Review module wires the core review-flow service and public DTO surface.
 */
@Module({
  imports: [
    ConfigModule,
    ClsModule,
    PrismaModule,
    PaymentsModule,
    TimelineEventsModule,
    EmailNotificationsModule,
  ],
  controllers: [AiReviewController],
  providers: [AiReviewService, GeminiService],
})
export class AiReviewModule {}
