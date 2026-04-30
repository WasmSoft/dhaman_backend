import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { TimelineEventsModule } from '../timeline-events/timeline-events.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';

@Module({
  imports: [
    PrismaModule,
    PaymentsModule,
    DeliveriesModule,
    TimelineEventsModule,
    EmailNotificationsModule,
  ],
  controllers: [ClientPortalController],
  providers: [ClientPortalService],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}
