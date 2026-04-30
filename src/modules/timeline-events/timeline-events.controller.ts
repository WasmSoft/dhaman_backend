import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TimelineActorRole, TimelineEventType } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PortalTokenGuard } from '../../common/guards/portal-token.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  PaginatedTimelineEventsResponseDto,
  TimelineQueryDto,
} from './dto/timeline-events.dto';
import { TimelineEventsService } from './timeline-events.service';

@ApiTags('Timeline Events')
@Controller()
export class TimelineEventsController {
  constructor(private readonly timelineEventsService: TimelineEventsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List agreement timeline events',
    description:
      'Returns a paginated evidence timeline for an agreement owned by the authenticated freelancer. Timeline creation is internal service behavior and is not exposed as a public create/update/delete API.',
  })
  @ApiParam({
    name: 'agreementId',
    description: 'Agreement UUID.',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: TimelineEventType,
    description: 'Optional timeline event type filter.',
  })
  @ApiQuery({
    name: 'milestoneId',
    required: false,
    type: String,
    description: 'Optional milestone UUID filter.',
  })
  @ApiQuery({
    name: 'actorRole',
    required: false,
    enum: TimelineActorRole,
    description: 'Optional actor role filter.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Optional createdAt lower bound in ISO 8601 format.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'Optional createdAt upper bound in ISO 8601 format.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number. Defaults to 1.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Page size. Defaults to 20, maximum 100.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agreement timeline returned successfully.',
    type: PaginatedTimelineEventsResponseDto,
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
    status: 403,
    description: 'FORBIDDEN',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'AGREEMENT_NOT_FOUND',
    type: ErrorResponseDto,
  })
  @Get('agreements/:agreementId/timeline')
  listByAgreementId(
    @Param('agreementId', ParseUuidPipe) agreementId: string,
    @Query() query: TimelineQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.timelineEventsService.listByAgreementId(
      agreementId,
      query,
      user.id,
    );
  }

  @Public()
  @UseGuards(PortalTokenGuard)
  @ApiOperation({
    summary: 'List portal timeline events',
    description:
      'Returns a paginated client-safe evidence timeline for the agreement represented by the portal token. ' +
      'Returned metadata is client-safe and must not contain raw portal tokens, password hashes, provider secrets, ' +
      'full sensitive AI prompts, or private internal implementation details. ' +
      'Timeline creation is internal service behavior and is not exposed as a public create/update/delete API.',
  })
  @ApiParam({
    name: 'token',
    description: 'Portal link token for the client agreement workspace.',
    type: String,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: TimelineEventType,
    description: 'Optional timeline event type filter.',
  })
  @ApiQuery({
    name: 'milestoneId',
    required: false,
    type: String,
    description: 'Optional milestone UUID filter.',
  })
  @ApiQuery({
    name: 'actorRole',
    required: false,
    enum: TimelineActorRole,
    description: 'Optional actor role filter.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Optional createdAt lower bound in ISO 8601 format.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'Optional createdAt upper bound in ISO 8601 format.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number. Defaults to 1.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Page size. Defaults to 20, maximum 100.',
  })
  @ApiResponse({
    status: 200,
    description: 'Portal timeline returned successfully with client-safe metadata only.',
    type: PaginatedTimelineEventsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'PORTAL_TOKEN_INVALID, PORTAL_TOKEN_EXPIRED, or PORTAL_TOKEN_REVOKED',
    type: ErrorResponseDto,
  })
  @Get('portal/:token/timeline')
  listByPortalToken(
    @Param('token') rawToken: string,
    @Query() query: TimelineQueryDto,
  ) {
    return this.timelineEventsService.listByPortalToken(rawToken, query);
  }
}
