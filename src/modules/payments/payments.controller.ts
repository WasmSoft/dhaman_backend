import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PortalTokenGuard } from '../../common/guards/portal-token.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  FundMilestoneDto,
  FundMilestonePaymentDto,
  PortalFundPaymentDto,
  PortalReleaseConfirmationDto,
  ReleasePaymentDto,
  PaymentResponseDto,
  PaymentReceiptResponseDto,
  PaymentListResponseDto,
} from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('agreements/:agreementId/payments')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List agreement payments',
    description:
      'Returns payment rows and summary totals for an agreement owned by the authenticated freelancer. Valid transitions: WAITING→RESERVED, RESERVED→CLIENT_REVIEW, CLIENT_REVIEW→READY_TO_RELEASE/AI_REVIEW/ON_HOLD, AI_REVIEW→READY_TO_RELEASE/ON_HOLD, READY_TO_RELEASE→RELEASED, ON_HOLD→CLIENT_REVIEW',
  })
  @ApiParam({ name: 'agreementId', description: 'Agreement UUID' })
  @ApiResponse({ status: 200, description: 'Agreement payments listed', type: PaymentListResponseDto })
  @ApiResponse({ status: 404, description: 'AGREEMENT_NOT_FOUND' })
  listByAgreementId(
    @Param('agreementId', ParseUuidPipe) agreementId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.listByAgreementId(agreementId, user.id);
  }

  @Post('payments/fund-milestone')
  @ApiOperation({
    summary: 'Fund milestone payment in demo mode',
    description:
      'Documents the future WAITING to RESERVED transition for milestone funding.',
  })
  @ApiBody({ type: FundMilestoneDto })
  @ApiResponse({ status: 201, description: 'Payment funded in demo mode', type: PaymentResponseDto })
  @ApiResponse({ status: 400, description: 'PAYMENT_INVALID_AMOUNT or PAYMENT_DEMO_MODE_ONLY' })
  @ApiResponse({ status: 404, description: 'PAYMENT_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'PAYMENT_ALREADY_RESERVED' })
  fundMilestone(
    @Body() dto: FundMilestoneDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.fundMilestone(dto, user.id);
  }

  @Post('payments/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Release ready payment in demo mode',
    description:
      'Documents the future READY_TO_RELEASE to RELEASED transition.',
  })
  @ApiBody({ type: ReleasePaymentDto })
  @ApiResponse({ status: 200, description: 'Payment released in demo mode', type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'PAYMENT_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'PAYMENT_NOT_READY_TO_RELEASE or PAYMENT_ALREADY_RELEASED' })
  release(
    @Body() dto: ReleasePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.release(dto, user.id);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get payment details' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Payment details returned', type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'PAYMENT_NOT_FOUND' })
  getById(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.getById(id, user.id);
  }

  @Get('payments/:id/receipt')
  @ApiOperation({ summary: 'Get payment receipt' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Payment receipt returned', type: PaymentReceiptResponseDto })
  @ApiResponse({ status: 404, description: 'PAYMENT_NOT_FOUND' })
  getReceipt(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.getReceipt(id, user.id);
  }

  @Public()
  @UseGuards(PortalTokenGuard)
  @Post('portal/:token/payments/:paymentId/fund')
  @ApiOperation({
    summary: 'Portal fund payment (CLIENT)',
    description:
      'Client funds a milestone payment via portal token. Validates the portal token, then executes WAITING → RESERVED transition with receipt generation. Timeline events use actorRole = CLIENT.',
  })
  @ApiParam({ name: 'token', description: 'Portal access token' })
  @ApiParam({ name: 'paymentId', description: 'Payment UUID' })
  @ApiBody({ type: PortalFundPaymentDto })
  @ApiResponse({ status: 201, description: 'Payment funded via portal', type: PaymentResponseDto })
  @ApiResponse({ status: 400, description: 'PAYMENT_INVALID_AMOUNT' })
  @ApiResponse({ status: 401, description: 'PORTAL_TOKEN_INVALID or PORTAL_TOKEN_EXPIRED' })
  @ApiResponse({ status: 403, description: 'PORTAL_ACTION_NOT_ALLOWED' })
  @ApiResponse({ status: 404, description: 'PAYMENT_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'PAYMENT_ALREADY_RESERVED' })
  portalFund(
    @Param('token') token: string,
    @Param('paymentId', ParseUuidPipe) paymentId: string,
    @Body() dto: PortalFundPaymentDto,
  ) {
    return this.paymentsService.portalFund(token, paymentId, dto);
  }

  @Public()
  @UseGuards(PortalTokenGuard)
  @Post('portal/:token/payments/:paymentId/release-confirmation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Portal release confirmation (CLIENT)',
    description:
      'Client confirms release of a ready payment via portal token. Validates the portal token, then executes READY_TO_RELEASE → RELEASED transition. Timeline events use actorRole = CLIENT.',
  })
  @ApiParam({ name: 'token', description: 'Portal access token' })
  @ApiParam({ name: 'paymentId', description: 'Payment UUID' })
  @ApiBody({ type: PortalReleaseConfirmationDto })
  @ApiResponse({ status: 200, description: 'Payment released via portal', type: PaymentResponseDto })
  @ApiResponse({ status: 401, description: 'PORTAL_TOKEN_INVALID or PORTAL_TOKEN_EXPIRED' })
  @ApiResponse({ status: 403, description: 'PORTAL_ACTION_NOT_ALLOWED' })
  @ApiResponse({ status: 404, description: 'PAYMENT_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'PAYMENT_NOT_READY_TO_RELEASE or PAYMENT_ALREADY_RELEASED' })
  portalReleaseConfirmation(
    @Param('token') token: string,
    @Param('paymentId', ParseUuidPipe) paymentId: string,
    @Body() dto: PortalReleaseConfirmationDto,
  ) {
    return this.paymentsService.portalReleaseConfirmation(token, paymentId, dto);
  }
}