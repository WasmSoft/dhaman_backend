import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  ChangeRequestActionDto,
  CreateChangeRequestDto,
} from './dto/change-requests.dto';
import { ChangeRequestsService } from './change-requests.service';

@ApiTags('Change Requests')
@Controller('change-requests')
export class ChangeRequestsController {
  constructor(private readonly changeRequestsService: ChangeRequestsService) {}

  @Get()
  list() {
    return this.changeRequestsService.list();
  }

  @Post()
  create(@Body() dto: CreateChangeRequestDto) {
    return this.changeRequestsService.create(dto);
  }

  @Get(':id')
  getById(@Param('id', ParseUuidPipe) id: string) {
    return this.changeRequestsService.getById(id);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: ChangeRequestActionDto,
  ) {
    return this.changeRequestsService.approve(id, dto);
  }

  @Post(':id/decline')
  decline(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: ChangeRequestActionDto,
  ) {
    return this.changeRequestsService.decline(id, dto);
  }

  @Post(':id/pay')
  pay(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: ChangeRequestActionDto,
  ) {
    return this.changeRequestsService.pay(id, dto);
  }
}
