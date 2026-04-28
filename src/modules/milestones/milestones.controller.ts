import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  UpdateMilestoneStatusDto,
} from './dto/milestones.dto';
import { MilestonesService } from './milestones.service';

@ApiTags('Milestones')
@Controller()
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get('agreements/:agreementId/milestones')
  listByAgreementId(@Param('agreementId', ParseUuidPipe) agreementId: string) {
    return this.milestonesService.listByAgreementId(agreementId);
  }

  @Post('agreements/:agreementId/milestones')
  create(
    @Param('agreementId', ParseUuidPipe) agreementId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.milestonesService.create(agreementId, dto);
  }

  @Patch('milestones/:id')
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(id, dto);
  }

  @Patch('milestones/:id/status')
  updateStatus(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateMilestoneStatusDto,
  ) {
    return this.milestonesService.updateStatus(id, dto);
  }
}
