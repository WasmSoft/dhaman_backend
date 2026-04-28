import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { UpdateAgreementPoliciesDto } from './dto/agreement-policies.dto';
import { AgreementPoliciesService } from './agreement-policies.service';

@ApiTags('Agreement Policies')
@Controller()
export class AgreementPoliciesController {
  constructor(
    private readonly agreementPoliciesService: AgreementPoliciesService,
  ) {}

  @Get('agreements/:agreementId/policies')
  getByAgreementId(@Param('agreementId', ParseUuidPipe) agreementId: string) {
    return this.agreementPoliciesService.getByAgreementId(agreementId);
  }

  @Patch('agreements/:agreementId/policies')
  updateByAgreementId(
    @Param('agreementId', ParseUuidPipe) agreementId: string,
    @Body() dto: UpdateAgreementPoliciesDto,
  ) {
    return this.agreementPoliciesService.updateByAgreementId(agreementId, dto);
  }
}
