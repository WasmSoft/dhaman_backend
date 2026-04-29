import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  CreateMilestoneDto,
  DeleteMilestoneResponseDto,
  MilestoneArrayResponseDto,
  MilestoneListResponseDto,
  MilestoneMutationResponseDto,
  MilestoneResponseDto,
  ReorderMilestonesDto,
  UpdateMilestoneDto,
} from './dto/milestones.dto';
import { MilestonesService } from './milestones.service';

@ApiTags('Milestones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get('agreements/:agreementId/milestones')
  @ApiOperation({
    summary: 'List agreement milestones',
    description:
      'Returns owned agreement milestones with totals. AR: يعرض مراحل الاتفاق المملوك مع الإجماليات.',
  })
  @ApiParam({ name: 'agreementId', description: 'Agreement ID' })
  @ApiResponse({ status: 200, type: MilestoneListResponseDto })
  @ApiResponse({ status: 404, description: 'AGREEMENT_NOT_FOUND' })
  getAgreementMilestones(
    @Param('agreementId', ParseUuidPipe) agreementId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.milestonesService.getAgreementMilestones(agreementId, user.id);
  }

  @Post('agreements/:agreementId/milestones')
  @ApiOperation({
    summary: 'Create milestone',
    description:
      'Creates a milestone for an owned draft agreement and creates the waiting demo payment. AR: ينشئ مرحلة لاتفاق مملوك في حالة مسودة وينشئ دفعة تجريبية في حالة انتظار.',
  })
  @ApiParam({ name: 'agreementId', description: 'Agreement ID' })
  @ApiResponse({ status: 201, type: MilestoneMutationResponseDto })
  @ApiResponse({ status: 400, description: 'MILESTONE_INVALID_AMOUNT' })
  @ApiResponse({ status: 404, description: 'AGREEMENT_NOT_FOUND' })
  @ApiResponse({
    status: 409,
    description: 'AGREEMENT_CANNOT_BE_MODIFIED, MILESTONE_INVALID_ORDER',
  })
  createMilestone(
    @Param('agreementId', ParseUuidPipe) agreementId: string,
    @Body() dto: CreateMilestoneDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.milestonesService.createMilestone(agreementId, dto, user.id);
  }

  @Patch('milestones/:id')
  @ApiOperation({
    summary: 'Update milestone',
    description:
      'Updates editable milestone fields for an owned draft agreement. AR: يحدّث حقول المرحلة القابلة للتعديل لاتفاق مملوك في حالة مسودة.',
  })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  @ApiResponse({ status: 200, type: MilestoneMutationResponseDto })
  @ApiResponse({ status: 400, description: 'MILESTONE_INVALID_AMOUNT' })
  @ApiResponse({
    status: 404,
    description: 'MILESTONE_NOT_FOUND, PAYMENT_NOT_FOUND',
  })
  @ApiResponse({ status: 409, description: 'AGREEMENT_CANNOT_BE_MODIFIED' })
  updateMilestone(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.milestonesService.updateMilestone(id, dto, user.id);
  }

  @Delete('milestones/:id')
  @ApiOperation({
    summary: 'Delete milestone',
    description:
      'Deletes a milestone only when its linked payment is still waiting. AR: يحذف المرحلة فقط إذا كانت دفعتها المرتبطة ما زالت في حالة انتظار.',
  })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  @ApiResponse({ status: 200, type: DeleteMilestoneResponseDto })
  @ApiResponse({ status: 404, description: 'MILESTONE_NOT_FOUND' })
  @ApiResponse({
    status: 409,
    description: 'AGREEMENT_CANNOT_BE_MODIFIED, MILESTONE_PAYMENT_NOT_WAITING',
  })
  deleteMilestone(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.milestonesService.deleteMilestone(id, user.id);
  }

  @Patch('milestones/:id/reorder')
  @ApiOperation({
    summary: 'Reorder milestones',
    description:
      'Reorders milestones for an owned draft agreement using a full replacement list. AR: يعيد ترتيب مراحل اتفاق مملوك في حالة مسودة باستخدام قائمة كاملة.',
  })
  @ApiParam({
    name: 'id',
    description: 'Milestone ID used to locate the agreement',
  })
  @ApiResponse({ status: 200, type: MilestoneArrayResponseDto })
  @ApiResponse({ status: 404, description: 'MILESTONE_NOT_FOUND' })
  @ApiResponse({
    status: 409,
    description: 'AGREEMENT_CANNOT_BE_MODIFIED, MILESTONE_INVALID_ORDER',
  })
  reorderMilestones(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: ReorderMilestonesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.milestonesService.reorderMilestones(id, dto, user.id);
  }

  @Get('milestones/:id')
  @ApiOperation({
    summary: 'Get milestone',
    description: 'Returns one owned milestone. AR: يعرض مرحلة مملوكة واحدة.',
  })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  @ApiResponse({ status: 200, type: MilestoneResponseDto })
  @ApiResponse({ status: 404, description: 'MILESTONE_NOT_FOUND' })
  getMilestone(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.milestonesService.getMilestone(id, user.id);
  }
}
