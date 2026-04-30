import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  AgreementPolicyResponseDto,
  DefaultPoliciesResponseDto,
  UpdateAgreementPolicyDto,
  UpdateDefaultPoliciesDto,
} from './dto/agreement-policies.dto';
import { AgreementPoliciesService } from './agreement-policies.service';

@ApiTags('Agreement Policies', 'Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AgreementPoliciesController {
  constructor(
    private readonly agreementPoliciesService: AgreementPoliciesService,
  ) {}

  @ApiOperation({
    summary: 'Get agreement policy',
    description: 'Returns the policy attached to an agreement owned by the authenticated freelancer.',
  })
  @ApiParam({ name: 'agreementId', type: String, description: 'Agreement identifier.' })
  @ApiResponse({ status: 200, type: AgreementPolicyResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @Get('agreements/:agreementId/policies')
  getPolicy(@Param('agreementId', ParseUuidPipe) agreementId: string) {
    return this.agreementPoliciesService.getPolicy(agreementId);
  }

  @ApiOperation({
    summary: 'Update agreement policy',
    description: 'Creates or updates the policy attached to a draft agreement owned by the authenticated freelancer.',
  })
  @ApiParam({ name: 'agreementId', type: String, description: 'Agreement identifier.' })
  @ApiBody({ type: UpdateAgreementPolicyDto })
  @ApiResponse({ status: 200, type: AgreementPolicyResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  @Patch('agreements/:agreementId/policies')
  upsertPolicy(
    @Param('agreementId', ParseUuidPipe) agreementId: string,
    @Body() dto: UpdateAgreementPolicyDto,
  ) {
    return this.agreementPoliciesService.upsertPolicy(agreementId, dto);
  }

  @ApiOperation({
    summary: 'Get default policy template',
    description: 'Returns the authenticated freelancer reusable default agreement policy template.',
  })
  @ApiResponse({ status: 200, type: DefaultPoliciesResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @Get('settings/default-policies')
  getDefaultPolicies(): Promise<DefaultPoliciesResponseDto> {
    return this.agreementPoliciesService.getDefaultPolicies();
  }

  @ApiOperation({
    summary: 'Update default policy template',
    description: 'Updates the authenticated freelancer reusable default agreement policy template.',
  })
  @ApiBody({ type: UpdateDefaultPoliciesDto })
  @ApiResponse({ status: 200, type: DefaultPoliciesResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @Patch('settings/default-policies')
  updateDefaultPolicies(
    @Body() dto: UpdateDefaultPoliciesDto,
  ): Promise<DefaultPoliciesResponseDto> {
    return this.agreementPoliciesService.updateDefaultPolicies(dto);
  }
}
