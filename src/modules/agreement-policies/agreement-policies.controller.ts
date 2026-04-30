import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
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

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AgreementPoliciesController {
  constructor(
    private readonly agreementPoliciesService: AgreementPoliciesService,
  ) {}

  @ApiTags('Agreement Policies')
  @ApiOperation({
    summary: 'Get agreement policy',
    description:
      'Returns the agreement-specific policy for an agreement owned by the authenticated freelancer. ' +
      'Agreement policies are contract context and can later inform AI Review.',
  })
  @ApiParam({
    name: 'agreementId',
    type: String,
    description: 'Agreement identifier owned by the authenticated freelancer.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agreement policy retrieved successfully.',
    type: AgreementPolicyResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED: Missing or invalid JWT.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description:
      'AGREEMENT_NOT_FOUND: Agreement not found or not owned by the requester; POLICY_NOT_FOUND: No policy record exists for the agreement.',
    type: ErrorResponseDto,
  })
  @Get('agreements/:agreementId/policies')
  getPolicy(@Param('agreementId', ParseUuidPipe) agreementId: string) {
    return this.agreementPoliciesService.getPolicy(agreementId);
  }

  @ApiTags('Agreement Policies')
  @ApiOperation({
    summary: 'Update agreement policy',
    description:
      'Creates or updates the agreement-specific policy for an owned DRAFT agreement. ' +
      'Only DRAFT agreements can be changed, and the saved policy feeds later AI Review context.',
  })
  @ApiParam({
    name: 'agreementId',
    type: String,
    description: 'Agreement identifier owned by the authenticated freelancer.',
  })
  @ApiBody({ type: UpdateAgreementPolicyDto })
  @ApiResponse({
    status: 200,
    description: 'Agreement policy saved successfully.',
    type: AgreementPolicyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'VALIDATION_ERROR: Request body failed validation; POLICY_INVALID_CONTENT: Policy text is empty or too long; POLICY_INVALID_REVIEW_PERIOD: Review or grace day value is out of range.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED: Missing or invalid JWT.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description:
      'AGREEMENT_NOT_FOUND: Agreement not found or not owned by the requester.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description:
      'AGREEMENT_CANNOT_BE_MODIFIED: Agreement is not in DRAFT status.',
    type: ErrorResponseDto,
  })
  @Patch('agreements/:agreementId/policies')
  upsertPolicy(
    @Param('agreementId', ParseUuidPipe) agreementId: string,
    @Body() dto: UpdateAgreementPolicyDto,
  ) {
    return this.agreementPoliciesService.upsertPolicy(agreementId, dto);
  }

  @ApiTags('Settings')
  @ApiOperation({
    summary: 'Get default policy template',
    description:
      'Returns the authenticated freelancer reusable default policy template for future agreements. ' +
      'These settings are not agreement-specific contract terms.',
  })
  @ApiResponse({
    status: 200,
    description: 'Default policy template retrieved successfully.',
    type: DefaultPoliciesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED: Missing or invalid JWT.',
    type: ErrorResponseDto,
  })
  @Get('settings/default-policies')
  getDefaultPolicies(): Promise<DefaultPoliciesResponseDto> {
    return this.agreementPoliciesService.getDefaultPolicies();
  }

  @ApiTags('Settings')
  @ApiOperation({
    summary: 'Update default policy template',
    description:
      'Partially updates the authenticated freelancer reusable default policy template. ' +
      'Omitted fields preserve their current values.',
  })
  @ApiBody({ type: UpdateDefaultPoliciesDto })
  @ApiResponse({
    status: 200,
    description: 'Default policy template saved successfully.',
    type: DefaultPoliciesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'VALIDATION_ERROR: Request body failed validation; POLICY_INVALID_CONTENT: Policy text is empty or too long; POLICY_INVALID_REVIEW_PERIOD: Review or grace day value is out of range.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED: Missing or invalid JWT.',
    type: ErrorResponseDto,
  })
  @Patch('settings/default-policies')
  updateDefaultPolicies(
    @Body() dto: UpdateDefaultPoliciesDto,
  ): Promise<DefaultPoliciesResponseDto> {
    return this.agreementPoliciesService.updateDefaultPolicies(dto);
  }
}
