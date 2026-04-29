import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ReviewPaymentReleaseDto {
  @ApiProperty({
    description: 'Agreement identifier in UUID v4 format.',
    example: 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f',
  })
  @IsString()
  @IsUUID('4')
  agreementId!: string;

  @ApiProperty({
    description: 'Milestone identifier in UUID v4 format.',
    example: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
  })
  @IsString()
  @IsUUID('4')
  milestoneId!: string;

  @ApiProperty({
    description: 'Delivery identifier in UUID v4 format.',
    example: '0fed4321-09bc-4654-8210-fedcba987654',
  })
  @IsString()
  @IsUUID('4')
  deliveryId!: string;

  @ApiProperty({
    description:
      'Freelancer note explaining why the delivery should be reviewed before release.',
    example:
      'أعتقد أن التسليم يستوفي 4 من 5 معايير، وأرغب في تحليل الذكاء الاصطناعي قبل عرضه على العميل.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  objection!: string;

  @ApiPropertyOptional({
    description:
      'Optional acceptance criteria labels the freelancer wants the AI review to focus on.',
    example: ['performance budget', 'RTL support'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  relatedCriteria?: string[];
}
