import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { EmailNotificationResponseDto } from '../email-notifications/dto/email-notifications.dto';
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
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AgreementStatus } from '../../common/enums/agreement-status.enum';
import { AgreementQueryDto } from './dto/agreement-query.dto';
import { AgreementListResponseDto } from './dto/agreement-list.dto';
import { AgreementResponseDto } from './dto/agreement-response.dto';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { AgreementsService } from './agreements.service';

@ApiTags('Agreements')
@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List freelancer agreements',
    description:
      'Returns a paginated list of all agreements owned by the authenticated freelancer. ' +
      'Supports filtering by lifecycle status and client, text search across title and client name, ' +
      'and pagination controls. Always scoped to the current freelancer — no cross-freelancer data is returned.',
  })
  @ApiQuery({
    name: 'status',
    enum: AgreementStatus,
    required: false,
    description: 'Filter by lifecycle status',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    description: 'Search title and client name',
    example: 'موقع',
  })
  @ApiQuery({
    name: 'clientId',
    type: String,
    required: false,
    description: 'Filter by linked client ID',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Items per page — max 100',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of agreements',
    type: AgreementListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR: Invalid filter or pagination values',
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED: Missing or invalid JWT',
  })
  list(@Query() query: AgreementQueryDto) {
    return this.agreementsService.list(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new agreement',
    description:
      'Creates a new agreement in DRAFT status owned by the authenticated freelancer. ' +
      'An optional clientId links an existing client at creation time. ' +
      "Currency defaults to the freelancer's preferred currency when not provided. " +
      'Records an AGREEMENT_CREATED timeline event.',
  })
  @ApiResponse({
    status: 201,
    description: 'Agreement created in DRAFT status',
    type: AgreementResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR: Required fields missing or invalid',
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED: Missing or invalid JWT',
  })
  @ApiResponse({
    status: 404,
    description:
      'CLIENT_NOT_FOUND: Provided clientId does not exist or belongs to another freelancer',
  })
  create(@Body() dto: CreateAgreementDto) {
    return this.agreementsService.create(dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get agreement details',
    description:
      'Returns the full agreement record including linked client, milestones ordered by position, ' +
      'and attached policy. Used by the agreement detail, builder, and workspace screens. ' +
      'Returns 404 for agreements not owned by the authenticated freelancer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Agreement ID owned by the authenticated freelancer',
  })
  @ApiResponse({
    status: 200,
    description: 'Full agreement details with all relations',
    type: AgreementResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED: Missing or invalid JWT',
  })
  @ApiResponse({
    status: 404,
    description:
      'AGREEMENT_NOT_FOUND: Agreement does not exist or belongs to another freelancer',
  })
  getById(@Param('id') id: string) {
    return this.agreementsService.getById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a draft agreement',
    description:
      'Partially updates a DRAFT agreement. Only agreements in DRAFT status can be edited; ' +
      'any other status returns 409. If clientId is changed, the new client must exist and belong ' +
      'to the freelancer. If totalAmount is provided, it must match the current sum of milestone amounts.',
  })
  @ApiParam({
    name: 'id',
    description: 'Agreement ID owned by the authenticated freelancer',
  })
  @ApiResponse({
    status: 200,
    description: 'Agreement updated successfully',
    type: AgreementResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'VALIDATION_ERROR or PAYMENT_INVALID_AMOUNT: Invalid input or totalAmount does not match milestone sum',
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED: Missing or invalid JWT',
  })
  @ApiResponse({
    status: 404,
    description: 'AGREEMENT_NOT_FOUND or CLIENT_NOT_FOUND',
  })
  @ApiResponse({
    status: 409,
    description:
      'AGREEMENT_CANNOT_BE_MODIFIED: Agreement is not in DRAFT status',
  })
  update(@Param('id') id: string, @Body() dto: UpdateAgreementDto) {
    return this.agreementsService.update(id, dto);
  }

  @Post(':id/send-invite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send agreement invite to client',
    description:
      'Transitions a DRAFT agreement to SENT. Validates readiness (linked client, ' +
      'milestones, policy, amount consistency), generates unique invite and portal tokens, ' +
      'records an AGREEMENT_SENT timeline event, and initiates client notification. ' +
      'Fails fast with a specific error if any readiness condition is not met.',
  })
  @ApiParam({
    name: 'id',
    description: 'Agreement ID owned by the authenticated freelancer',
  })
  @ApiResponse({
    status: 200,
    description: 'Invite sent — agreement is now SENT',
    type: AgreementResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Missing client (AGREEMENT_CLIENT_REQUIRED), missing milestones (VALIDATION_ERROR), missing policy (AGREEMENT_POLICY_REQUIRED), or amount mismatch (PAYMENT_INVALID_AMOUNT)',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid JWT (UNAUTHORIZED)',
  })
  @ApiResponse({
    status: 404,
    description:
      'Agreement not found or not owned by requester (AGREEMENT_NOT_FOUND)',
  })
  @ApiResponse({
    status: 409,
    description: 'Agreement is not in DRAFT status (AGREEMENT_ALREADY_SENT)',
  })
  sendInvite(@Param('id') id: string) {
    return this.agreementsService.sendInvite(id);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate an approved agreement',
    description:
      'Transitions a freelancer-owned agreement from APPROVED to ACTIVE, starts ' +
      'the first DRAFT milestone when present, records a bilingual lifecycle ' +
      'history event, and enqueues a client activation notification after the ' +
      'database transaction commits.',
  })
  @ApiParam({
    name: 'id',
    description: 'Agreement ID owned by the authenticated freelancer',
  })
  @ApiResponse({
    status: 200,
    description: 'Agreement activated successfully.',
    type: AgreementResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid JWT (UNAUTHORIZED)',
  })
  @ApiResponse({
    status: 404,
    description:
      'Agreement not found or not owned by requester (AGREEMENT_NOT_FOUND)',
  })
  @ApiResponse({
    status: 409,
    description:
      'Agreement is not in APPROVED status (AGREEMENT_CANNOT_BE_MODIFIED)',
  })
  activate(@Param('id') id: string) {
    return this.agreementsService.activate(id);
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resend an agreement invitation',
    description:
      'Resends an agreement invitation to the client after ownership and invitation-state checks. Uses existing valid portal token or creates a new one. Returns the persisted email notification record.',
  })
  @ApiParam({ name: 'id', description: 'Agreement ID', format: 'uuid' })
  @ApiResponse({
    status: 201,
    description: 'Invite resend accepted and notification record returned.',
    type: EmailNotificationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Client email missing or request validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Agreement or template not found.' })
  @ApiResponse({ status: 409, description: 'Agreement cannot be invited in its current state.' })
  @Post(':id/resend-invite')
  resendInvite(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.agreementsService.resendInvite(id, user.id);
  }

  @Post(':id/approve')
  approve(@Param('id', ParseUuidPipe) id: string) {
    return this.agreementsService.approve(id);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Archive a non-completed agreement',
    description:
      'Transitions a freelancer-owned non-COMPLETED agreement to CANCELLED, ' +
      'cancels all non-ACCEPTED milestones, cascades unreleased unfinished-work ' +
      'payments only when the pre-archive status was ACTIVE, records a bilingual ' +
      'lifecycle history event, and enqueues a client cancellation notification ' +
      'after commit when the client had prior visibility.',
  })
  @ApiParam({
    name: 'id',
    description: 'Agreement ID owned by the authenticated freelancer',
  })
  @ApiResponse({
    status: 200,
    description: 'Agreement archived successfully.',
    type: AgreementResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid JWT (UNAUTHORIZED)',
  })
  @ApiResponse({
    status: 404,
    description:
      'Agreement not found or not owned by requester (AGREEMENT_NOT_FOUND)',
  })
  @ApiResponse({
    status: 409,
    description:
      'Agreement is COMPLETED and cannot be archived (AGREEMENT_CANNOT_BE_MODIFIED)',
  })
  archive(@Param('id') id: string) {
    return this.agreementsService.archive(id);
  }
}
