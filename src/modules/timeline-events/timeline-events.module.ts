import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { TimelineEventsController } from './timeline-events.controller';
import { TimelineEventsService } from './timeline-events.service';

@Module({
  imports: [PrismaModule],
  controllers: [TimelineEventsController],
  providers: [TimelineEventsService],
  exports: [TimelineEventsService],
})
export class TimelineEventsModule {}
