import { Module } from '@nestjs/common';
import { ChangeRequestsController } from './change-requests.controller';
import { ChangeRequestsService } from './change-requests.service';
import { PaymentsModule } from '../payments/payments.module';
import { TimelineEventsModule } from '../timeline-events/timeline-events.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';

@Module({
  imports: [PaymentsModule, TimelineEventsModule, EmailNotificationsModule],
  controllers: [ChangeRequestsController],
  providers: [ChangeRequestsService],
  exports: [ChangeRequestsService],
})
export class ChangeRequestsModule {}
