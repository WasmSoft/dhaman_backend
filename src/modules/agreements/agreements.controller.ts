import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AgreementQueryDto } from './dto/agreement-query.dto';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { AgreementsService } from './agreements.service';

@ApiTags('Agreements')
@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Get()
  list(@Query() query: AgreementQueryDto) {
    return this.agreementsService.list();
  }

  @Post()
  create(@Body() dto: CreateAgreementDto) {
    return this.agreementsService.create(dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.agreementsService.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAgreementDto) {
    return this.agreementsService.update(id, dto);
  }

  @Post(':id/send-invite')
  sendInvite(@Param('id') id: string) {
    return this.agreementsService.sendInvite(id);
  }
}
