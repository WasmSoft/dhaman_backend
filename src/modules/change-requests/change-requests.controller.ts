import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PortalTokenGuard } from '../../common/guards/portal-token.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { UpdateChangeRequestDto } from './dto/update-change-request.dto';
import { ChangeRequestQueryDto } from './dto/change-request-query.dto';
import { PortalDeclineChangeRequestDto } from './dto/portal-decline-change-request.dto';
import { PortalFundPaymentDto } from '../payments/dto/payments.dto';
import {
  ChangeRequestResponseDto,
  ChangeRequestListItemDto,
} from './dto/change-request-response.dto';
import { ChangeRequestsService } from './change-requests.service';

const ERR_UNAUTHORIZED = 'UNAUTHORIZED — Authentication is required';
const ERR_AGREEMENT_NOT_FOUND = 'AGREEMENT_NOT_FOUND — Agreement was not found';
const ERR_CR_NOT_FOUND =
  'CHANGE_REQUEST_NOT_FOUND — Change request was not found';
const ERR_FORBIDDEN =
  'FORBIDDEN — You do not have permission to access this change request';
const ERR_PORTAL_TOKEN_INVALID =
  'PORTAL_TOKEN_INVALID — Client portal link is invalid';
const ERR_VALIDATION = 'VALIDATION_ERROR — Invalid request data';
const ERR_NOT_EDITABLE =
  'CHANGE_REQUEST_NOT_EDITABLE — Change request cannot be edited in its current state';
const ERR_NOT_SENDABLE =
  'CHANGE_REQUEST_NOT_SENDABLE — Change request cannot be sent in its current state';
const ERR_NOT_APPROVABLE =
  'CHANGE_REQUEST_NOT_APPROVABLE — Change request cannot be approved in its current state';
const ERR_NOT_DECLINABLE =
  'CHANGE_REQUEST_NOT_DECLINABLE — Change request cannot be declined in its current state';
const ERR_NOT_APPROVED =
  'CHANGE_REQUEST_NOT_APPROVED — Change request must be approved before funding';
const ERR_AMOUNT_INVALID =
  'CHANGE_REQUEST_AMOUNT_INVALID — Amount must be greater than zero';
const ERR_NOT_FUNDABLE =
  'PAYMENT_NOT_FUNDABLE — Payment cannot be funded in its current state';

@ApiTags('Change Requests')
@Controller()
export class ChangeRequestsController {
  constructor(private readonly changeRequestsService: ChangeRequestsService) {}

  // ============================================================
  // US1: Freelancer endpoints
  // ============================================================

  @Get('agreements/:id/change-requests')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List change requests for an agreement',
    description:
      'Returns paginated list of change requests scoped to the agreement owned by the authenticated freelancer.',
  })
  @ApiParam({ name: 'id', description: 'Agreement UUID' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by change request status',
  })
  @ApiQuery({
    name: 'milestoneId',
    required: false,
    description: 'Filter by milestone UUID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-indexed)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Results per page',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of change requests',
    type: [ChangeRequestListItemDto],
  })
  @ApiResponse({ status: 401, description: ERR_UNAUTHORIZED })
  @ApiResponse({ status: 404, description: ERR_AGREEMENT_NOT_FOUND })
  list(
    @Param('id', ParseUuidPipe) agreementId: string,
    @Query() query: ChangeRequestQueryDto,
  ) {
    return this.changeRequestsService.list(agreementId, query);
  }

  @Post('agreements/:id/change-requests')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a change request',
    description:
      'Creates an out-of-scope paid change request for the agreement. Freelancer must own the agreement.',
  })
  @ApiParam({ name: 'id', description: 'Agreement UUID' })
  @ApiBody({ type: CreateChangeRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Change request created',
    type: ChangeRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: ERR_AMOUNT_INVALID })
  @ApiResponse({ status: 401, description: ERR_UNAUTHORIZED })
  @ApiResponse({ status: 404, description: ERR_AGREEMENT_NOT_FOUND })
  create(
    @Param('id', ParseUuidPipe) agreementId: string,
    @Body() dto: CreateChangeRequestDto,
  ) {
    return this.changeRequestsService.create(agreementId, dto);
  }

  @Get('change-requests/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get a change request by ID',
    description:
      'Returns the full detail of a change request with payment summary.',
  })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({
    status: 200,
    description: 'Change request detail',
    type: ChangeRequestResponseDto,
  })
  @ApiResponse({ status: 401, description: ERR_UNAUTHORIZED })
  @ApiResponse({ status: 403, description: ERR_FORBIDDEN })
  @ApiResponse({ status: 404, description: ERR_CR_NOT_FOUND })
  getById(@Param('id', ParseUuidPipe) id: string) {
    return this.changeRequestsService.getById(id);
  }

  @Patch('change-requests/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update a change request',
    description:
      'Updates editable fields of a change request. Only allowed in DRAFT state before client approval.',
  })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiBody({ type: UpdateChangeRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Change request updated',
    type: ChangeRequestResponseDto,
  })
  @ApiResponse({ status: 401, description: ERR_UNAUTHORIZED })
  @ApiResponse({ status: 404, description: ERR_CR_NOT_FOUND })
  @ApiResponse({ status: 409, description: ERR_NOT_EDITABLE })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateChangeRequestDto,
  ) {
    return this.changeRequestsService.update(id, dto);
  }

  @Post('change-requests/:id/send')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Send a change request to the client',
    description: 'Sends the change request to the client for approval review.',
  })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({
    status: 200,
    description: 'Change request sent',
    type: ChangeRequestResponseDto,
  })
  @ApiResponse({ status: 401, description: ERR_UNAUTHORIZED })
  @ApiResponse({ status: 404, description: ERR_CR_NOT_FOUND })
  @ApiResponse({ status: 409, description: ERR_NOT_SENDABLE })
  send(@Param('id', ParseUuidPipe) id: string) {
    return this.changeRequestsService.send(id);
  }

  // ============================================================
  // US2: Client portal approve and decline
  // ============================================================

  @Post('portal/:token/change-requests/:id/approve')
  @Public()
  @UseGuards(PortalTokenGuard)
  @ApiOperation({
    summary: 'Approve a change request via portal',
    description:
      'Client approves a change request via portal token. Creates a separate waiting payment through the Payments service.',
  })
  @ApiParam({ name: 'token', description: 'Client portal access token' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({
    status: 200,
    description: 'Change request approved',
    type: ChangeRequestResponseDto,
  })
  @ApiResponse({ status: 401, description: ERR_PORTAL_TOKEN_INVALID })
  @ApiResponse({ status: 404, description: ERR_CR_NOT_FOUND })
  @ApiResponse({ status: 409, description: ERR_NOT_APPROVABLE })
  approveChangeRequest(
    @Param('token') _token: string,
    @Param('id', ParseUuidPipe) id: string,
  ) {
    return this.changeRequestsService.approveFromPortal(id);
  }

  @Post('portal/:token/change-requests/:id/decline')
  @Public()
  @UseGuards(PortalTokenGuard)
  @ApiOperation({
    summary: 'Decline a change request via portal',
    description:
      'Client declines a change request with a reason. Original milestone payment remains unchanged.',
  })
  @ApiParam({ name: 'token', description: 'Client portal access token' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiBody({ type: PortalDeclineChangeRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Change request declined',
    type: ChangeRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: ERR_VALIDATION })
  @ApiResponse({ status: 401, description: ERR_PORTAL_TOKEN_INVALID })
  @ApiResponse({ status: 404, description: ERR_CR_NOT_FOUND })
  @ApiResponse({ status: 409, description: ERR_NOT_DECLINABLE })
  declineChangeRequest(
    @Param('token') _token: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: PortalDeclineChangeRequestDto,
  ) {
    return this.changeRequestsService.declineFromPortal(id, dto);
  }

  // ============================================================
  // US3: Client portal fund
  // ============================================================

  @Post('portal/:token/change-requests/:id/fund')
  @Public()
  @UseGuards(PortalTokenGuard)
  @ApiOperation({
    summary: 'Fund a change request payment via portal',
    description:
      'Client funds the separate change request payment in demo mode. Change request must be approved before funding. Original milestone payment remains unchanged.',
  })
  @ApiParam({ name: 'token', description: 'Client portal access token' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiBody({ type: PortalFundPaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment reserved and change request funded',
    type: ChangeRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: ERR_VALIDATION })
  @ApiResponse({ status: 401, description: ERR_PORTAL_TOKEN_INVALID })
  @ApiResponse({ status: 404, description: ERR_CR_NOT_FOUND })
  @ApiResponse({ status: 409, description: ERR_NOT_APPROVED })
  fundChangeRequest(
    @Param('token') _token: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: PortalFundPaymentDto,
  ) {
    return this.changeRequestsService.fundFromPortal(id, dto);
  }
}
