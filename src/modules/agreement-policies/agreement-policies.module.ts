import { Module } from '@nestjs/common';
import { AgreementPoliciesController } from './agreement-policies.controller';
import { AgreementPoliciesService } from './agreement-policies.service';

@Module({
  controllers: [AgreementPoliciesController],
  providers: [AgreementPoliciesService],
})
export class AgreementPoliciesModule {}
