import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TimelineActorRole } from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PortalTokenGuard } from '../../common/guards/portal-token.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  AcceptRecommendationDto,
  AcceptRecommendationResponseDto,
  AiReviewListResponseDto,
  AiReviewResponseDto,
  GetAiReviewsQueryDto,
  OpenAiReviewDto,
  ReviewPaymentReleaseDto,
} from './dto';
import { AiReviewService } from './ai-review.service';

@ApiTags('AI Review')
@ApiExtraModels(
  OpenAiReviewDto,
  ReviewPaymentReleaseDto,
  AcceptRecommendationDto,
  GetAiReviewsQueryDto,
  AiReviewResponseDto,
  AiReviewListResponseDto,
  AcceptRecommendationResponseDto,
)
@Controller()
export class AiReviewController {
  constructor(
    private readonly aiReviewService: AiReviewService,
    private readonly clsService: ClsService,
  ) {}

  @Get('ai-reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List AI reviews',
    description:
      'Returns paginated AI reviews for the authenticated freelancer. Supports filtering by agreementId and status.',
  })
  @ApiResponse({ status: 200, type: AiReviewListResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  findAll(@Query() query: GetAiReviewsQueryDto) {
    const userId = this.clsService.get('userId');
    return this.aiReviewService.findAll(userId ?? '', query);
  }

  @Get('ai-reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get AI review by ID',
    description:
      'Returns a single AI review. Returns 404 if the review does not exist or the authenticated freelancer does not own the related agreement.',
  })
  @ApiParam({
    name: 'id',
    description: 'AI review ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ status: 200, type: AiReviewResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 404, description: 'AI_REVIEW_NOT_FOUND' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    const userId = this.clsService.get('userId');
    return this.aiReviewService.findOne(id, userId ?? '');
  }

  @Post('ai-reviews/:id/accept-recommendation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Accept AI recommendation',
    description:
      'Applies the AI recommendation to the milestone payment. ACCEPT moves payment to READY_TO_RELEASE; REJECT and PARTIAL move it to ON_HOLD; NEEDS_HUMAN_REVIEW leaves payment unchanged. Optionally creates ChangeRequests for out-of-scope items.',
  })
  @ApiParam({
    name: 'id',
    description: 'AI review ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ status: 200, type: AcceptRecommendationResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 404, description: 'AI_REVIEW_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'AI_REVIEW_ALREADY_COMPLETED' })
  acceptRecommendation(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: AcceptRecommendationDto,
  ) {
    const userId = this.clsService.get('userId');
    return this.aiReviewService.acceptRecommendation(id, dto, userId ?? '');
  }

  @Post('ai/review-payment-release')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request AI review for payment release',
    description:
      'Creates a freelancer-initiated AI review for proactive payment release validation.',
  })
  @ApiResponse({ status: 201, type: AiReviewResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 404, description: 'DELIVERY_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'AI_REVIEW_ALREADY_COMPLETED' })
  reviewPaymentRelease(@Body() dto: ReviewPaymentReleaseDto) {
    const userId = this.clsService.get('userId');
    return this.aiReviewService.reviewPaymentRelease(dto, userId ?? '');
  }

  @Post('portal/:token/deliveries/:id/open-ai-review')
  @UseGuards(PortalTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Open AI review via portal',
    description:
      'Opens an AI review for a delivery using a portal access token. Accessible by clients through the portal link.',
  })
  @ApiParam({
    name: 'token',
    description: 'Portal access token',
    type: 'string',
  })
  @ApiParam({
    name: 'id',
    description: 'Delivery ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ status: 201, type: AiReviewResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 404, description: 'DELIVERY_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'AI_REVIEW_ALREADY_COMPLETED' })
  @ApiResponse({ status: 500, description: 'AI_REVIEW_FAILED' })
  openReview(
    @Param('token') _token: string,
    @Param('id', ParseUuidPipe) deliveryId: string,
    @Body() dto: OpenAiReviewDto,
  ) {
    return this.aiReviewService.openReview(
      deliveryId,
      dto,
      TimelineActorRole.CLIENT,
      this.clsService.get('portalTokenId'),
    );
  }
}
