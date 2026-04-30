import { Module } from '@nestjs/common';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { PaymentsModule } from '../payments/payments.module';
import { TimelineEventsModule } from '../timeline-events/timeline-events.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';

@Module({
  imports: [PaymentsModule, TimelineEventsModule, EmailNotificationsModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
