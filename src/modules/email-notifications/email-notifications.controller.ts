import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  EmailLogQueryDto,
  EmailNotificationResponseDto,
  EmailPreviewResponseDto,
  PaginatedEmailNotificationsResponseDto,
  PreviewEmailDto,
  SendTestNotificationDto,
} from './dto/email-notifications.dto';
import { EmailNotificationsService } from './email-notifications.service';

@ApiTags('Email Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('email-notifications')
export class EmailNotificationsController {
  constructor(
    private readonly emailNotificationsService: EmailNotificationsService,
  ) {}

  @ApiOperation({
    summary: 'Preview an email notification template',
    description:
      'Renders a notification email in preview mode without sending email and without creating a send attempt record. The template is selected by notification type and rendered in the requested locale, defaulting to Arabic.',
  })
  @ApiBody({ type: PreviewEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Preview rendered successfully.',
    type: EmailPreviewResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Agreement or template not found.' })
  @Post('preview')
  preview(
    @Body() dto: PreviewEmailDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.emailNotificationsService.previewEmail(dto, user.id);
  }
}

@ApiTags('Email Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('emails')
export class EmailsController {
  constructor(
    private readonly emailNotificationsService: EmailNotificationsService,
  ) {}

  @Get('logs')
  @ApiOperation({
    summary: 'List freelancer-scoped email notification logs',
    description:
      'Returns paginated email notification logs visible to the authenticated freelancer. Results are scoped to agreements owned by the freelancer and can be filtered by type, status, agreementId, recipientEmail, and date range.',
  })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'status', required: false, enum: NotificationStatus })
  @ApiQuery({ name: 'agreementId', required: false, type: String, description: 'Agreement UUID filter.' })
  @ApiQuery({ name: 'recipientEmail', required: false, type: String, description: 'Recipient email filter.' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'ISO date lower bound.' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'ISO date upper bound.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1).' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Page size (default 20, max 100).' })
  @ApiResponse({
    status: 200,
    description: 'Email logs returned successfully.',
    type: PaginatedEmailNotificationsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  listLogs(
    @Query() query: EmailLogQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.emailNotificationsService.listEmailLogs(query, user.id);
  }
}

@ApiTags('Email Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly emailNotificationsService: EmailNotificationsService,
  ) {}

  @Post('test')
  @ApiOperation({
    summary: 'Send a test notification',
    description:
      'Creates a test notification log and returns SENT status if the email provider works, or FAILED status with preview HTML if the provider is unavailable. Supports SYSTEM_TEST and other documented notification types.',
  })
  @ApiBody({ type: SendTestNotificationDto })
  @ApiResponse({
    status: 201,
    description: 'Test notification record created.',
    type: EmailNotificationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Agreement or template not found.' })
  sendTest(
    @Body() dto: SendTestNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.emailNotificationsService.sendTestNotification(dto, user.id);
  }
}
