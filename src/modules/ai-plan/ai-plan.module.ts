import { Module } from '@nestjs/common';
import { ClsModule } from '../../common/cls/cls.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiPlanController } from './ai-plan.controller';
import { AiPlanService } from './ai-plan.service';
import { GeminiProvider } from './gemini.provider';

@Module({
  imports: [ClsModule, PrismaModule],
  controllers: [AiPlanController],
  providers: [GeminiProvider, AiPlanService],
  exports: [AiPlanService],
})
export class AiPlanModule {}
