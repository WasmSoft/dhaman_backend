import { ApiProperty } from '@nestjs/swagger';
import { AiReviewResponseDto } from './ai-review-response.dto';

export class AcceptRecommendationResponseDto {
  @ApiProperty({ type: () => AiReviewResponseDto })
  review!: AiReviewResponseDto;

  @ApiProperty({
    description:
      'Payment status after applying the recommendation. Possible outcomes include READY_TO_RELEASE, ON_HOLD, AI_REVIEW, or the existing status for human review cases.',
    example: 'READY_TO_RELEASE',
  })
  paymentStatus!: string;

  @ApiProperty({
    description:
      'Number of change request records created from out-of-scope items.',
    example: 1,
  })
  changeRequestsCreated!: number;
}
