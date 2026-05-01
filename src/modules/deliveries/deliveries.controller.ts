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
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { DeliveryStatus } from '../../common/enums/delivery-status.enum';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PortalTokenGuard } from '../../common/guards/portal-token.guard';
import {
  AcceptDeliveryDto,
  CreateDeliveryDto,
  DeliveryListResponseDto,
  DeliveryQueryDto,
  DeliveryResponseDto,
  RequestDeliveryChangesDto,
  SubmitDeliveryDto,
  UpdateDeliveryDto,
} from './dto';
import { DeliveriesService } from './deliveries.service';

@ApiTags('Deliveries')
@Controller()
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a draft delivery',
    description:
      'Creates a draft delivery for an owned active milestone. No payment, email, or AI side effects happen in this creation step.',
  })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  @ApiBody({ type: CreateDeliveryDto })
  @ApiResponse({
    status: 201,
    description: 'Draft delivery created.',
    type: DeliveryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'MILESTONE_NOT_FOUND or AGREEMENT_NOT_FOUND',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'DELIVERY_ALREADY_EXISTS',
    type: ErrorResponseDto,
  })
  @Post('milestones/:id/deliveries')
  create(
    @Param('id', ParseUuidPipe) milestoneId: string,
    @Body() dto: CreateDeliveryDto,
  ) {
    return this.deliveriesService.createDelivery(milestoneId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List freelancer deliveries',
    description:
      'Returns a paginated deliveries list scoped to the authenticated freelancer. This is a read-only contract with no payment, timeline, email, or AI side effects.',
  })
  @ApiQuery({
    name: 'agreementId',
    required: false,
    description: 'Optional agreement UUID filter',
  })
  @ApiQuery({
    name: 'milestoneId',
    required: false,
    description: 'Optional milestone UUID filter',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DeliveryStatus,
    description: 'Optional delivery status filter',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Optional page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
    description: 'Optional page size',
  })
  @ApiResponse({
    status: 200,
    description: 'Deliveries list returned.',
    type: DeliveryListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED',
    type: ErrorResponseDto,
  })
  @Get('deliveries')
  list(@Query() query: DeliveryQueryDto) {
    return this.deliveriesService.listDeliveries(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get delivery details',
    description:
      'Returns one owned delivery with milestone, payment summary, and timeline reference data. This is a read-only contract with no side effects.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Delivery UUID' })
  @ApiResponse({
    status: 200,
    description: 'Delivery details returned.',
    type: DeliveryResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'FORBIDDEN',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'DELIVERY_NOT_FOUND',
    type: ErrorResponseDto,
  })
  @Get('deliveries/:id')
  getById(@Param('id', ParseUuidPipe) id: string) {
    return this.deliveriesService.getDeliveryById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update a draft or requested-changes delivery',
    description:
      'Updates an editable delivery before submission or after client-requested changes. No payment, email, or AI side effects happen in this update step.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Delivery UUID' })
  @ApiBody({ type: UpdateDeliveryDto })
  @ApiResponse({
    status: 200,
    description: 'Delivery updated.',
    type: DeliveryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'DELIVERY_NOT_FOUND',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'DELIVERY_NOT_EDITABLE',
    type: ErrorResponseDto,
  })
  @Patch('deliveries/:id')
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateDeliveryDto,
  ) {
    return this.deliveriesService.updateDelivery(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Submit a delivery for client review',
    description:
      'Marks a delivery as submitted for client review. The contract documents that the submit flow creates a delivery timeline event, sends a client notification email, and requests the payment transition from RESERVED to CLIENT_REVIEW through PaymentsService.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Delivery UUID' })
  @ApiBody({ type: SubmitDeliveryDto })
  @ApiResponse({
    status: 200,
    description: 'Delivery submitted for client review.',
    type: DeliveryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'DELIVERY_NOT_FOUND',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'DELIVERY_NOT_SUBMITTABLE or PAYMENT_NOT_RESERVED',
    type: ErrorResponseDto,
  })
  @Post('deliveries/:id/submit')
  submit(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: SubmitDeliveryDto,
  ) {
    return this.deliveriesService.submitDelivery(id, dto);
  }

  @ApiOperation({
    summary: 'Get a delivery via client portal token',
    description: 'Fetches delivery details using a portal token (AGREEMENT_APPROVAL or DELIVERY_REVIEW type).',
  })
  @UseGuards(PortalTokenGuard)
  @ApiParam({ name: 'token', type: String, description: 'Client portal access token' })
  @ApiParam({ name: 'id', type: String, description: 'Delivery UUID' })
  @ApiResponse({ status: 200, description: 'Delivery returned.', type: DeliveryResponseDto })
  @ApiResponse({ status: 401, description: 'PORTAL_TOKEN_INVALID', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'DELIVERY_NOT_FOUND', type: ErrorResponseDto })
  @Get('portal/:token/deliveries/:id')
  getFromPortal(
    @Param('token') token: string,
    @Param('id', ParseUuidPipe) id: string,
  ) {
    return this.deliveriesService.getDeliveryFromPortal(token, id);
  }

  @ApiOperation({
    summary: 'Accept a delivery from the client portal',
    description:
      'Accepts a submitted delivery using a portal token. The contract documents that the accept flow creates a delivery timeline event and requests the payment transition from CLIENT_REVIEW to READY_TO_RELEASE through PaymentsService.',
  })
  @UseGuards(PortalTokenGuard)
  @ApiParam({
    name: 'token',
    type: String,
    description: 'Client portal access token',
  })
  @ApiParam({ name: 'id', type: String, description: 'Delivery UUID' })
  @ApiBody({ type: AcceptDeliveryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Delivery accepted from the portal.',
    type: DeliveryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'PORTAL_TOKEN_INVALID',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'DELIVERY_NOT_FOUND',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'DELIVERY_NOT_REVIEWABLE',
    type: ErrorResponseDto,
  })
  @Post('portal/:token/deliveries/:id/accept')
  acceptFromPortal(
    @Param('token') token: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto?: AcceptDeliveryDto,
  ) {
    return this.deliveriesService.acceptDeliveryFromPortal(token, id, dto);
  }

  @ApiOperation({
    summary: 'Request delivery changes from the client portal',
    description:
      'Requests delivery changes using a portal token. The contract documents that this flow creates a delivery timeline event and sends a freelancer notification email. Payment remains in client review unless PaymentsService later places it on hold.',
  })
  @UseGuards(PortalTokenGuard)
  @ApiParam({
    name: 'token',
    type: String,
    description: 'Client portal access token',
  })
  @ApiParam({ name: 'id', type: String, description: 'Delivery UUID' })
  @ApiBody({ type: RequestDeliveryChangesDto })
  @ApiResponse({
    status: 200,
    description: 'Delivery change request recorded from the portal.',
    type: DeliveryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'PORTAL_TOKEN_INVALID',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'DELIVERY_NOT_FOUND',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'DELIVERY_NOT_REVIEWABLE',
    type: ErrorResponseDto,
  })
  @Post('portal/:token/deliveries/:id/request-changes')
  requestChangesFromPortal(
    @Param('token') token: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: RequestDeliveryChangesDto,
  ) {
    return this.deliveriesService.requestChangesFromPortal(token, id, dto);
  }
}
