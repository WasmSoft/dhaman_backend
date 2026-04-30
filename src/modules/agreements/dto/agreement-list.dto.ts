import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { AgreementStatus } from '../../../common/enums/agreement-status.enum';

export class AgreementListItemDto {
  @ApiProperty({ description: 'Agreement unique identifier' })
  id: string;

  @ApiProperty({
    description: 'Agreement title',
    example: 'تصميم موقع إلكتروني',
  })
  title: string;

  @ApiProperty({ description: 'Linked client ID', nullable: true })
  clientId: string | null;

  @ApiProperty({ description: 'Linked client display name', nullable: true })
  clientName: string | null;

  @ApiProperty({ description: 'Total agreement value', example: 5000 })
  @Transform(({ value }) => (value != null ? Number(value) : value))
  totalAmount: number;

  @ApiProperty({ description: 'Currency code', example: 'SAR' })
  currency: string;

  @ApiProperty({
    description: 'Current lifecycle status',
    enum: AgreementStatus,
  })
  status: AgreementStatus;

  @ApiProperty({ description: 'Number of milestones attached', example: 3 })
  milestonesCount: number;

  @ApiProperty({
    description: 'When the invite was sent to the client',
    nullable: true,
  })
  sentAt: Date | null;

  @ApiProperty({ description: 'Record creation timestamp' })
  createdAt: Date;
}

export class AgreementListResponseDto {
  @ApiProperty({
    type: [AgreementListItemDto],
    description: 'Page of agreement summaries',
  })
  data: AgreementListItemDto[];

  @ApiProperty({ description: 'Total matching records', example: 42 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 3 })
  totalPages: number;
}
