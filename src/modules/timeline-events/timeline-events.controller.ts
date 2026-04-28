import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { TimelineQueryDto } from './dto/timeline-events.dto';
import { TimelineEventsService } from './timeline-events.service';

@ApiTags('Timeline Events')
@Controller()
export class TimelineEventsController {
  constructor(private readonly timelineEventsService: TimelineEventsService) {}

  @Get('agreements/:agreementId/timeline')
  listByAgreementId(
    @Param('agreementId', ParseUuidPipe) agreementId: string,
    @Query() query: TimelineQueryDto,
  ) {
    return this.timelineEventsService.listByAgreementId(agreementId, query);
  }
}
