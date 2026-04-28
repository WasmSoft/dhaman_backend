import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GenerateAiPlanDto } from './dto/ai-plan.dto';
import { AiPlanService } from './ai-plan.service';

@ApiTags('AI Plan')
@Controller('ai-plan')
export class AiPlanController {
  constructor(private readonly aiPlanService: AiPlanService) {}

  @Post('generate')
  generate(@Body() dto: GenerateAiPlanDto) {
    return this.aiPlanService.generate(dto);
  }
}
