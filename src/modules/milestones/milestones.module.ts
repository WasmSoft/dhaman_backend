import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { TimelineEventsModule } from '../timeline-events/timeline-events.module';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';

@Module({
  imports: [PaymentsModule, TimelineEventsModule],
  controllers: [MilestonesController],
  providers: [MilestonesService],
})
export class MilestonesModule {}
