import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PortalTokenGuard } from '../../common/guards/portal-token.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  PortalRequestChangesDto,
  PortalRejectAgreementDto,
} from './dto/portal-request.dto';
import { PortalActionResponseDto } from './dto/portal-action-response.dto';
import { PortalInviteResponseDto } from './dto/portal-invite-response.dto';
import {
  PortalWorkspaceResponseDto,
  PortalDeliverySummaryDto,
  PortalTimelineEventDto,
} from './dto/portal-workspace-response.dto';
import { PortalPaymentHistoryResponseDto } from './dto/portal-payment-history-response.dto';
import { PortalFundPaymentDto } from '../payments/dto/payments.dto';
import { PortalReleaseConfirmationDto } from '../payments/dto/payments.dto';
import { ClientPortalService } from './client-portal.service';

const TOKEN_PARAM = {
  name: 'token',
  description:
    'Portal access credential scoped to one agreement. No bearer token required.',
  example: 'xK9mP2vQ8nR5sT1wL4...',
};

const ERR_TOKEN_AUTH =
  'PORTAL_TOKEN_INVALID | PORTAL_TOKEN_EXPIRED | PORTAL_TOKEN_REVOKED';
const ERR_VALIDATION = 'VALIDATION_ERROR — Invalid request data.';
const ERR_DELIVERY_NOT_FOUND = 'DELIVERY_NOT_FOUND — Delivery was not found.';
const ERR_PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND — Payment was not found.';

@ApiTags('Client Portal')
@Controller('portal')
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  // ============================================================
  // Invite and agreement actions
  // ============================================================

  @Public()
  @UseGuards(PortalTokenGuard)
  @Get(':token/invite')
  @ApiParam(TOKEN_PARAM)
  @ApiOperation({
    summary: 'Get agreement invite summary',
    description:
      'Returns the agreement invitation summary for a client to review before approving. Scoped to the agreement bound to the portal token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Invite summary',
    type: PortalInviteResponseDto,
  })
  @ApiResponse({ status: 401, description: ERR_TOKEN_AUTH })
  @ApiResponse({
    status: 404,
    description: 'AGREEMENT_NOT_FOUND — Agreement was not found.',
  })
  getInvite(@Param('token') token: string) {
    return this.clientPortalService.getInvite(token);
  }

  @Public()
  @UseGuards(PortalTokenGuard)
  @Post(':token/approve')
  @ApiParam(TOKEN_PARAM)
  @ApiOperation({
    summary: 'Approve agreement',
    description:
      'Client approves the agreement invitation. Scoped to the agreement bound to the portal token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agreement approved',
    type: PortalActionResponseDto,
  })
  @ApiResponse({ status: 401, description: ERR_TOKEN_AUTH })
  @ApiResponse({
    status: 409,
    description:
      'AGREEMENT_NOT_APPROVABLE — Agreement cannot be approved in its current state.',
  })
  approve(@Param('token') token: string) {
    return this.clientPortalService.approve(token);
  }

  @Public()
  @UseGuards(PortalTokenGuard)
  @Post(':token/request-changes')
  @ApiParam(TOKEN_PARAM)
  @ApiBody({ type: PortalRequestChangesDto })
  @ApiOperation({
    summary: 'Request agreement changes',
    description:
      'Client requests edits to the agreement before approving. Scoped to the agreement bound to the portal token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Changes requested',
    type: PortalActionResponseDto,
  })
  @ApiResponse({ status: 400, description: ERR_VALIDATION })
  @ApiResponse({ status: 401, description: ERR_TOKEN_AUTH })
  @ApiResponse({
    status: 409,
    description:
      'AGREEMENT_NOT_CHANGEABLE — Agreement changes cannot be requested in its current state.',
  })
  requestChanges(
    @Param('token') token: string,
    @Body() dto: PortalRequestChangesDto,
  ) {
    return this.clientPortalService.requestChanges(token, dto);
  }

  @Public()
  @UseGuards(PortalTokenGuard)
  @Post(':token/reject')
  @ApiParam(TOKEN_PARAM)
  @ApiBody({ type: PortalRejectAgreementDto })
  @ApiOperation({
    summary: 'Reject agreement invitation',
    description:
      'Client rejects/declines the agreement invitation. Scoped to the agreement bound to the portal token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agreement rejected',
    type: PortalActionResponseDto,
  })
  @ApiResponse({ status: 400, description: ERR_VALIDATION })
  @ApiResponse({ status: 401, description: ERR_TOKEN_AUTH })
  @ApiResponse({
    status: 409,
    description:
      'AGREEMENT_NOT_REJECTABLE — Agreement cannot be rejected in its current state.',
  })
  rejectAgreement(
    @Param('token') token: string,
    @Body() dto: PortalRejectAgreementDto,
  ) {
    return this.clientPortalService.rejectAgreement(token, dto);
  }

  // ============================================================
  // Portal workspace
  // ============================================================

  @Public()
  @UseGuards(PortalTokenGuard)
  @Get(':token')
  @ApiParam(TOKEN_PARAM)
  @ApiOperation({
    summary: 'Get portal workspace',
    description:
      'Returns the full portal workspace for an approved agreement. Scoped to the agreement bound to the portal token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Portal workspace',
    type: PortalWorkspaceResponseDto,
  })
  @ApiResponse({ status: 401, description: ERR_TOKEN_AUTH })
  getPortal(@Param('token') token: string) {
    return this.clientPortalService.getPortal(token);
  }

  // ============================================================
  // Delivery actions
  // ============================================================

  @Public()
  @UseGuards(PortalTokenGuard)
  @Get(':token/deliveries/:deliveryId')
  @ApiParam(TOKEN_PARAM)
  @ApiParam({ name: 'deliveryId', description: 'Delivery UUID' })
  @ApiOperation({
    summary: 'Get delivery detail',
    description: 'Returns a single delivery scoped to the token agreement.',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery detail',
    type: PortalDeliverySummaryDto,
  })
  @ApiResponse({ status: 401, description: ERR_TOKEN_AUTH })
  @ApiResponse({ status: 404, description: ERR_DELIVERY_NOT_FOUND })
  getDelivery(
    @Param('token') token: string,
    @Param('deliveryId', ParseUuidPipe) deliveryId: string,
  ) {
    return this.clientPortalService.getDelivery(token, deliveryId);
  }

  @Public()
  @UseGuards(PortalTokenGuard)
  @Post(':token/deliveries/:deliveryId/accept')
  @ApiParam(TOKEN_PARAM)
  @ApiParam({ name: 'deliveryId', description: 'Delivery UUID' })
  @ApiOperation({
    summary: 'Accept delivery',
    description:
      'Client accepts a submitted delivery. Scoped to the agreement bound to the portal token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery accepted',
    type: PortalActionResponseDto,
  })
  @ApiResponse({ status: 401, description: ERR_TOKEN_AUTH })
  @ApiResponse({ status: 404, description: ERR_DELIVERY_NOT_FOUND })
  @ApiResponse({
    status: 409,
    description:
      'DELIVERY_NOT_REVIEWABLE — Delivery is not ready for client review.',
  })
  acceptDelivery(
    @Param('token') token: string,
    @Param('deliveryId', ParseUuidPipe) deliveryId: string,
  ) {
    return this.clientPortalService.acceptDelivery(token, deliveryId);
  }

  @Public()
  @UseGuards(PortalTokenGuard)
  @Post(':token/deliveries/:deliveryId/request-changes')
  @ApiParam(TOKEN_PARAM)
  @ApiParam({ name: 'deliveryId', description: 'Delivery UUID' })
  @ApiBody({ type: PortalRequestChangesDto })
  @ApiOperation({
    summary: 'Request delivery changes',
    description:
      'Client requests changes on a submitted delivery. Scoped to the agreement bound to the portal token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Changes requested on delivery',
    type: PortalActionResponseDto,
  })
  @ApiResponse({ status: 400, description: ERR_VALIDATION })
  @ApiResponse({ status: 401, description: ERR_TOKEN_AUTH })
  @ApiResponse({ status: 404, description: ERR_DELIVERY_NOT_FOUND })
  @ApiResponse({
    status: 409,
    description:
      'DELIVERY_NOT_REVIEWABLE — Delivery is not ready for client review.',
  })
  requestDeliveryChanges(
    @Param('token') token: string,
    @Param('deliveryId', ParseUuidPipe) deliveryId: string,
    @Body() dto: PortalRequestChangesDto,
  ) {
    return this.clientPortalService.requestDeliveryChanges(
      token,
      deliveryId,
      dto,
    );
  }

  // ============================================================
  // Payment actions
  // ============================================================

  @Public()
  @UseGuards(PortalTokenGuard)
  @Get(':token/payments')
  @ApiParam(TOKEN_PARAM)
  @ApiOperation({
    summary: 'Get payment plan',
    description:
      'Returns the full payment plan for the agreement. Scoped to the agreement bound to the portal token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment plan',
    type: PortalPaymentHistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: ERR_TOKEN_AUTH })
  getPayments(@Param('token') token: string) {
    return this.clientPortalService.getPayments(token);
  }

  @Public()
  @UseGuards(PortalTokenGuard)
  @Post(':token/payments/:id/fund')
  @ApiParam(TOKEN_PARAM)
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiBody({ type: PortalFundPaymentDto })
  @ApiOperation({
    summary: 'Fund a payment (demo mode)',
    description:
      'Demo-funds a payment, reserving it in demo mode. Scoped to the agreement bound to the portal token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment reserved',
    type: PortalActionResponseDto,
  })
  @ApiResponse({ status: 401, description: ERR_TOKEN_AUTH })
  @ApiResponse({ status: 404, description: ERR_PAYMENT_NOT_FOUND })
  @ApiResponse({
    status: 409,
    description:
      'PAYMENT_NOT_FUNDABLE — Payment cannot be funded in its current state.',
  })
  fundPayment(
    @Param('token') token: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: PortalFundPaymentDto,
  ) {
    return this.clientPortalService.fundPayment(token, id, dto);
  }

  @Public()
  @UseGuards(PortalTokenGuard)
  @Post(':token/payments/:id/release')
  @ApiParam(TOKEN_PARAM)
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiBody({ type: PortalReleaseConfirmationDto })
  @ApiOperation({
    summary: 'Release a payment',
    description:
      'Client confirms payment release. Scoped to the agreement bound to the portal token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment released',
    type: PortalActionResponseDto,
  })
  @ApiResponse({ status: 401, description: ERR_TOKEN_AUTH })
  @ApiResponse({ status: 404, description: ERR_PAYMENT_NOT_FOUND })
  @ApiResponse({
    status: 409,
    description:
      'PAYMENT_NOT_READY_TO_RELEASE — Payment is not ready to release.',
  })
  releasePayment(
    @Param('token') token: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: PortalReleaseConfirmationDto,
  ) {
    return this.clientPortalService.releasePayment(token, id, dto);
  }

  // ============================================================
  // Payment history and timeline
  // ============================================================

  @Public()
  @UseGuards(PortalTokenGuard)
  @Get(':token/payment-history')
  @ApiParam(TOKEN_PARAM)
  @ApiOperation({
    summary: 'Get payment history',
    description:
      'Returns demo payment transaction history for the agreement. Scoped to the agreement bound to the portal token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment transaction history',
    type: PortalPaymentHistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: ERR_TOKEN_AUTH })
  getPaymentHistory(@Param('token') token: string) {
    return this.clientPortalService.getPaymentHistory(token);
  }

  @Public()
  @UseGuards(PortalTokenGuard)
  @Get(':token/timeline')
  @ApiParam(TOKEN_PARAM)
  @ApiOperation({
    summary: 'Get agreement timeline',
    description:
      'Returns the agreement timeline events safe for client view. Scoped to the agreement bound to the portal token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Timeline events',
    type: [PortalTimelineEventDto],
  })
  @ApiResponse({ status: 401, description: ERR_TOKEN_AUTH })
  getTimeline(@Param('token') token: string) {
    return this.clientPortalService.getTimeline(token);
  }
}
