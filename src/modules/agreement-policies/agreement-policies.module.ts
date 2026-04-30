import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AgreementPoliciesController } from './agreement-policies.controller';
import { AgreementPoliciesService } from './agreement-policies.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AgreementPoliciesController],
  providers: [AgreementPoliciesService],
  exports: [AgreementPoliciesService],
})
export class AgreementPoliciesModule {}
