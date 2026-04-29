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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AgreementQueryDto } from './dto/agreement-query.dto';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { AgreementsService } from './agreements.service';

@ApiTags('Agreements')
@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Get()
  list(@Query() query: AgreementQueryDto) {
    return this.agreementsService.list(query);
  }

  @Post()
  create(@Body() dto: CreateAgreementDto) {
    return this.agreementsService.create(dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.agreementsService.getById(id);
  }

  @Patch(':id')
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
}
