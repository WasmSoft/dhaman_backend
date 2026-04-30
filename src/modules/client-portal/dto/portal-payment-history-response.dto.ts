import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class PortalPaymentRecordDto {
  @ApiProperty({ description: 'Payment identifier' })
  id!: string;

  @ApiProperty({ description: 'Milestone identifier' })
  milestoneId!: string;

  @ApiProperty({ description: 'Milestone title', example: 'Logo design' })
  milestoneTitle!: string;

  @ApiProperty({ description: 'Amount as Decimal-safe string', example: '2500.00' })
  amount!: string;

  @ApiProperty({ description: 'Currency code', example: 'SAR' })
  currency!: string;

  @ApiProperty({ description: 'Payment status', example: 'RESERVED' })
  status!: string;

  @ApiProperty({ description: 'Demo mode flag', example: true })
  demoMode!: boolean;

  @ApiProperty({ description: 'Creation timestamp in ISO 8601 format' })
  createdAt!: string;

  @ApiPropertyOptional({ description: 'Funded timestamp in ISO 8601 format' })
  fundedAt?: string;

  @ApiPropertyOptional({ description: 'Released timestamp in ISO 8601 format' })
  releasedAt?: string;
}

export class PortalPaymentHistoryResponseDto {
  @ApiProperty({ description: 'Agreement identifier' })
  agreementId!: string;

  @ApiProperty({
    description: 'List of payment records',
    type: [PortalPaymentRecordDto],
  })
  @ValidateNested({ each: true })
  @Type(() => PortalPaymentRecordDto)
  payments!: PortalPaymentRecordDto[];
}
