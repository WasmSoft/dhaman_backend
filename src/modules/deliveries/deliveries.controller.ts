import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  CreateDeliveryDto,
  DeliveryActionDto,
  DeliveryLookupDto,
} from './dto/deliveries.dto';
import { DeliveriesService } from './deliveries.service';

@ApiTags('Deliveries')
@Controller()
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post('milestones/:milestoneId/deliveries')
  create(
    @Param('milestoneId', ParseUuidPipe) milestoneId: string,
    @Body() dto: CreateDeliveryDto,
  ) {
    return this.deliveriesService.create(milestoneId, dto);
  }

  @Get('deliveries')
  list(@Query() query: DeliveryLookupDto) {
    return this.deliveriesService.list(query);
  }

  @Get('deliveries/:id')
  getById(@Param('id', ParseUuidPipe) id: string) {
    return this.deliveriesService.getById(id);
  }

  @Post('deliveries/:id/request-change')
  requestChange(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: DeliveryActionDto,
  ) {
    return this.deliveriesService.requestChange(id, dto);
  }

  @Post('deliveries/:id/accept')
  accept(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: DeliveryActionDto,
  ) {
    return this.deliveriesService.accept(id, dto);
  }
}
