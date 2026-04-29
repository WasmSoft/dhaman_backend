import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * AR: يمثل اعتراض العميل عند طلب مراجعة ذكاء اصطناعي لتسليم محدد.
 * EN: Captures the client objection when opening an AI review for a delivery.
 */
export class OpenAiReviewDto {
  @ApiProperty({
    description:
      'Client objection text for the disputed delivery. Example shown in Arabic for the default locale.',
    example:
      'الموقع لا يطابق التصميم المطلوب: الترويسة بألوان مختلفة، وقسم "معرض الأعمال" غير ظاهر على الجوال.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  objection!: string;

  @ApiPropertyOptional({
    description:
      'Optional acceptance criteria labels the client believes were not met.',
    example: ['responsive layout', 'portfolio section'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  relatedCriteria?: string[];
}
