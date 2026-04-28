import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CreateAiReviewDto } from './dto/ai-review.dto';
import { AiReviewService } from './ai-review.service';

@ApiTags('AI Review')
@Controller('ai-review')
export class AiReviewController {
  constructor(private readonly aiReviewService: AiReviewService) {}

  @Post()
  create(@Body() dto: CreateAiReviewDto) {
    return this.aiReviewService.create(dto);
  }

  @Get()
  list() {
    return this.aiReviewService.list();
  }

  @Get(':id')
  getById(@Param('id', ParseUuidPipe) id: string) {
    return this.aiReviewService.getById(id);
  }

  @Post(':id/accept-recommendation')
  acceptRecommendation(@Param('id', ParseUuidPipe) id: string) {
    return this.aiReviewService.acceptRecommendation(id);
  }
}
