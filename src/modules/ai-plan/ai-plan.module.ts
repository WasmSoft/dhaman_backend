import { Module } from '@nestjs/common';
import { AiPlanController } from './ai-plan.controller';
import { AiPlanService } from './ai-plan.service';

@Module({
  controllers: [AiPlanController],
  providers: [AiPlanService],
})
export class AiPlanModule {}
