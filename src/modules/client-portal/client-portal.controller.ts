import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PortalTokenGuard } from '../../common/guards/portal-token.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { PortalActionDto } from './dto/client-portal.dto';
import { ClientPortalService } from './client-portal.service';

@ApiTags('Client Portal')
@Controller('portal')
@UseGuards(PortalTokenGuard)
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  @Public()
  @Get(':token')
  getPortal(@Param('token') token: string) {
    return this.clientPortalService.getPortal(token);
  }

  @Public()
  @Post(':token/approve')
  approve(@Param('token') token: string, @Body() dto: PortalActionDto) {
    return this.clientPortalService.approve(token, dto);
  }

  @Public()
  @Post(':token/request-changes')
  requestChanges(@Param('token') token: string, @Body() dto: PortalActionDto) {
    return this.clientPortalService.requestChanges(token, dto);
  }

  @Public()
  @Get(':token/payments')
  getPayments(@Param('token') token: string) {
    return this.clientPortalService.getPayments(token);
  }

  @Public()
  @Get(':token/deliveries/:deliveryId')
  getDelivery(
    @Param('token') token: string,
    @Param('deliveryId', ParseUuidPipe) deliveryId: string,
  ) {
    return this.clientPortalService.getDelivery(token, deliveryId);
  }
}
