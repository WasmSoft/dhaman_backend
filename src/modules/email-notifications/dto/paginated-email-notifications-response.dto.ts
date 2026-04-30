import { ApiProperty } from '@nestjs/swagger';
import { EmailNotificationResponseDto } from './email-notification-response.dto';

export class PaginationMetaDto {
  @ApiProperty({
    description: 'Current page number.',
    minimum: 1,
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Page size.',
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total matching records.',
    minimum: 0,
    example: 42,
  })
  total!: number;

  @ApiProperty({
    description: 'Total pages for the current filter.',
    minimum: 0,
    example: 3,
  })
  totalPages!: number;
}

export class PaginatedEmailNotificationsResponseDto {
  @ApiProperty({
    description: 'Email notification records for the current page.',
    type: () => EmailNotificationResponseDto,
    isArray: true,
  })
  items!: EmailNotificationResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata.',
    type: () => PaginationMetaDto,
  })
  pagination!: PaginationMetaDto;
}
