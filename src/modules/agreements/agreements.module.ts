import { Module } from '@nestjs/common';
import { ClsModule } from '../../common/cls/cls.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { ClientsModule } from '../clients/clients.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { TimelineEventsModule } from '../timeline-events/timeline-events.module';
import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';

@Module({
  imports: [
    PrismaModule,
    ClsModule,
    ClientsModule,
    TimelineEventsModule,
    EmailNotificationsModule,
  ],
  controllers: [AgreementsController],
  providers: [AgreementsService],
  exports: [AgreementsService],
})
export class AgreementsModule {}
