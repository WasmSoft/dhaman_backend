import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { UpdateAgreementPolicyDto } from './dto/agreement-policies.dto';
import { AgreementPoliciesService } from './agreement-policies.service';

@ApiTags('Agreement Policies')
@Controller()
export class AgreementPoliciesController {
  constructor(
    private readonly agreementPoliciesService: AgreementPoliciesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('agreements/:agreementId/policies')
  getPolicy(@Param('agreementId', ParseUuidPipe) agreementId: string) {
    return this.agreementPoliciesService.getPolicy(agreementId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('agreements/:agreementId/policies')
  upsertPolicy(
    @Param('agreementId', ParseUuidPipe) agreementId: string,
    @Body() dto: UpdateAgreementPolicyDto,
  ) {
    return this.agreementPoliciesService.upsertPolicy(agreementId, dto);
  }
}
