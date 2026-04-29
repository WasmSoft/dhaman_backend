import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  GeneratePlanDto,
  GeneratePlanForAgreementDto,
  GeneratedPlanResponseDto,
} from './dto/ai-plan.dto';
import { AiPlanService } from './ai-plan.service';

@ApiTags('AI Plan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AiPlanController {
  constructor(private readonly aiPlanService: AiPlanService) {}

  @Post('ai/generate-payment-plan')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Generate standalone payment plan',
    description:
      'Generates a structured payment plan from a project description. Uses AI provider or deterministic mock fallback. Stores result as AiPlanDraft. AR: ينشئ خطة دفع منظمة من وصف المشروع.',
  })
  @ApiResponse({
    status: 201,
    type: GeneratedPlanResponseDto,
    description: 'Plan generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR — invalid input fields',
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED — missing or invalid JWT',
  })
  @ApiResponse({
    status: 502,
    description: 'AI_PLAN_GENERATION_FAILED | AI_INVALID_RESPONSE',
  })
  generatePaymentPlan(
    @Body() dto: GeneratePlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GeneratedPlanResponseDto> {
    return this.aiPlanService.generatePlan(dto, user.id);
  }

  @Post('agreements/:id/generate-plan')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Generate plan for agreement',
    description:
      'Generates a payment plan in the context of an existing agreement. Verifies agreement ownership. AR: ينشئ خطة دفع في سياق اتفاقية موجودة مع التحقق من الملكية.',
  })
  @ApiParam({ name: 'id', description: 'Agreement UUID' })
  @ApiResponse({
    status: 201,
    type: GeneratedPlanResponseDto,
    description: 'Plan generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR — invalid input fields',
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED — missing or invalid JWT',
  })
  @ApiResponse({
    status: 404,
    description:
      'AGREEMENT_NOT_FOUND — does not exist or not owned by requester',
  })
  @ApiResponse({
    status: 502,
    description: 'AI_PLAN_GENERATION_FAILED | AI_INVALID_RESPONSE',
  })
  generatePlanForAgreement(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: GeneratePlanForAgreementDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GeneratedPlanResponseDto> {
    return this.aiPlanService.generatePlanForAgreement(id, dto, user.id);
  }
}
