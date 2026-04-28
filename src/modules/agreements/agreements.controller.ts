import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  AgreementActionDto,
  CreateAgreementDto,
  UpdateAgreementDto,
} from './dto/agreements.dto';
import { AgreementsService } from './agreements.service';

@ApiTags('Agreements')
@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Get()
  list() {
    return this.agreementsService.list();
  }

  @Post()
  create(@Body() dto: CreateAgreementDto) {
    return this.agreementsService.create(dto);
  }

  @Get(':id')
  getById(@Param('id', ParseUuidPipe) id: string) {
    return this.agreementsService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateAgreementDto,
  ) {
    return this.agreementsService.update(id, dto);
  }

  @Post(':id/send-invite')
  sendInvite(@Param('id', ParseUuidPipe) id: string) {
    return this.agreementsService.sendInvite(id);
  }

  @Post(':id/approve')
  approve(@Param('id', ParseUuidPipe) id: string) {
    return this.agreementsService.approve(id);
  }

  @Post(':id/request-change')
  requestChange(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: AgreementActionDto,
  ) {
    return this.agreementsService.requestChange(id, dto);
  }
}
