import { Module } from '@nestjs/common';
import { AgreementsModule } from '../agreements/agreements.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { TimelineEventsModule } from '../timeline-events/timeline-events.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TimelineEventsModule } from '../timeline-events/timeline-events.module';

@Module({
  imports: [AgreementsModule, PrismaModule, TimelineEventsModule],
  imports: [TimelineEventsModule, PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
