import { Module } from '@nestjs/common';
import { AgreementsModule } from '../agreements/agreements.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { TimelineEventsModule } from '../timeline-events/timeline-events.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AgreementsModule, PrismaModule, TimelineEventsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
