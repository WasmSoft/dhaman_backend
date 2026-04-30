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
  AgreementActionDto,
  CreateAgreementDto,
  UpdateAgreementDto,
} from './dto/agreements.dto';
import { AgreementsService } from './agreements.service';

@ApiTags('Agreements')
@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Get()
  list() {
    return this.agreementsService.list();
  }

  @Post()
  create(@Body() dto: CreateAgreementDto) {
    return this.agreementsService.create(dto);
  }

  @Get(':id')
  getById(@Param('id', ParseUuidPipe) id: string) {
    return this.agreementsService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateAgreementDto,
  ) {
    return this.agreementsService.update(id, dto);
  }

  @Post(':id/send-invite')
  sendInvite(@Param('id', ParseUuidPipe) id: string) {
    return this.agreementsService.sendInvite(id);
  }

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

  @Post(':id/request-change')
  requestChange(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: AgreementActionDto,
  ) {
    return this.agreementsService.requestChange(id, dto);
  }
}
