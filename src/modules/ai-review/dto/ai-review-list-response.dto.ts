import { ApiProperty } from '@nestjs/swagger';
import { AiReviewResponseDto } from './ai-review-response.dto';

export class AiReviewListResponseDto {
  @ApiProperty({ type: () => AiReviewResponseDto, isArray: true })
  reviews!: AiReviewResponseDto[];

  @ApiProperty({
    description: 'Total number of AI reviews matching the applied filters.',
    example: 14,
  })
  total!: number;
}
