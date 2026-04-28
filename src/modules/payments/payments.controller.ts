import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { FundMilestonePaymentDto, ReleasePaymentDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('agreements/:agreementId/payments')
  listByAgreementId(@Param('agreementId', ParseUuidPipe) agreementId: string) {
    return this.paymentsService.listByAgreementId(agreementId);
  }

  @Post('payments/fund-milestone')
  fundMilestone(@Body() dto: FundMilestonePaymentDto) {
    return this.paymentsService.fundMilestone(dto);
  }

  @Post('payments/release')
  release(@Body() dto: ReleasePaymentDto) {
    return this.paymentsService.release(dto);
  }

  @Get('payments/:id')
  getById(@Param('id', ParseUuidPipe) id: string) {
    return this.paymentsService.getById(id);
  }

  @Get('payments/:id/receipt')
  getReceipt(@Param('id', ParseUuidPipe) id: string) {
    return this.paymentsService.getReceipt(id);
  }
}
