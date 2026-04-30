import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const DECIMAL_SAFE_PATTERN = /^\d+(\.\d{1,2})?$/;

export class FundMilestoneDto {
  @ApiProperty({
    description: 'Milestone identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  milestoneId!: string;

  @ApiProperty({
    description:
      'Amount in Decimal-safe string format (positive, max 2 decimals)',
    example: '1500.00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(DECIMAL_SAFE_PATTERN, {
    message:
      'Amount must be a valid Decimal-safe string (digits with up to 2 decimal places)',
  })
  amount!: string;

  @ApiPropertyOptional({
    description: 'Payment method display label',
    example: 'Demo Bank Transfer',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethodLabel?: string;
}

export class PortalFundPaymentDto {
  @ApiProperty({
    description:
      'Amount in Decimal-safe string format (positive, max 2 decimals)',
    example: '1500.00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(DECIMAL_SAFE_PATTERN, {
    message:
      'Amount must be a valid Decimal-safe string (digits with up to 2 decimal places)',
  })
  amount!: string;

  @ApiPropertyOptional({
    description: 'Payment method display label',
    example: 'Demo Bank Transfer',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethodLabel?: string;
}

export class ReleasePaymentDto {
  @ApiProperty({
    description: 'Payment identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  paymentId!: string;

  @ApiPropertyOptional({ description: 'Release notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class PortalReleaseConfirmationDto {
  @ApiProperty({ description: 'Confirmation flag', example: true })
  @IsBoolean()
  @IsNotEmpty()
  confirmed!: boolean;

  @ApiPropertyOptional({ description: 'Confirmation notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment identifier' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Agreement identifier' })
  @IsString()
  agreementId!: string;

  @ApiPropertyOptional({ description: 'Milestone identifier' })
  @IsOptional()
  @IsString()
  milestoneId?: string;

  @ApiPropertyOptional({ description: 'Change request identifier' })
  @IsOptional()
  @IsString()
  changeRequestId?: string;

  @ApiProperty({
    description: 'Amount in Decimal-safe string format',
    example: '1500.00',
  })
  @IsString()
  amount!: string;

  @ApiProperty({ description: 'Currency code', example: 'SAR' })
  @IsString()
  currency!: string;

  @ApiProperty({ description: 'Payment status' })
  @IsString()
  status!: string;

  @ApiProperty({ description: 'Payment operation type' })
  @IsString()
  operationType!: string;

  @ApiPropertyOptional({ description: 'Payment method label' })
  @IsOptional()
  @IsString()
  paymentMethodLabel?: string;

  @ApiPropertyOptional({
    description: 'Receipt number',
    example: 'DHM-20260429-A1B2C3',
  })
  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @ApiPropertyOptional({
    description: 'Transaction reference',
    example: 'TXN-cuidvalue',
  })
  @IsOptional()
  @IsString()
  transactionReference?: string;

  @ApiProperty({ description: 'Demo mode flag', example: true })
  @IsBoolean()
  demoMode!: boolean;

  @ApiPropertyOptional({ description: 'Reserved timestamp' })
  @IsOptional()
  @IsString()
  reservedAt?: string;

  @ApiPropertyOptional({ description: 'Released timestamp' })
  @IsOptional()
  @IsString()
  releasedAt?: string;

  @ApiProperty({ description: 'Created timestamp' })
  @IsString()
  createdAt!: string;

  @ApiProperty({ description: 'Updated timestamp' })
  @IsString()
  updatedAt!: string;
}

export class PaymentReceiptResponseDto {
  @ApiProperty({ description: 'Payment identifier' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Payment identifier reference' })
  @IsString()
  paymentId!: string;

  @ApiProperty({
    description: 'Receipt number',
    example: 'DHM-20260429-A1B2C3',
  })
  @IsString()
  receiptNumber!: string;

  @ApiProperty({
    description: 'Transaction reference',
    example: 'TXN-cuidvalue',
  })
  @IsString()
  transactionReference!: string;

  @ApiProperty({
    description: 'Amount in Decimal-safe string format',
    example: '1500.00',
  })
  @IsString()
  amount!: string;

  @ApiProperty({ description: 'Currency code', example: 'SAR' })
  @IsString()
  currency!: string;

  @ApiProperty({ description: 'Payment status' })
  @IsString()
  status!: string;

  @ApiProperty({ description: 'Payment operation type' })
  @IsString()
  operationType!: string;

  @ApiPropertyOptional({ description: 'Payment method label' })
  @IsOptional()
  @IsString()
  paymentMethodLabel?: string;

  @ApiProperty({ description: 'Agreement identifier' })
  @IsString()
  agreementId!: string;

  @ApiPropertyOptional({ description: 'Milestone title' })
  @IsOptional()
  @IsString()
  milestoneTitle?: string;

  @ApiProperty({ description: 'Demo mode flag', example: true })
  @IsBoolean()
  demoMode!: boolean;

  @ApiPropertyOptional({ description: 'Reserved timestamp' })
  @IsOptional()
  @IsString()
  reservedAt?: string;

  @ApiProperty({ description: 'Created timestamp' })
  @IsString()
  createdAt!: string;

  @ApiProperty({ description: 'Issued timestamp' })
  @IsString()
  issuedAt!: string;
}

export class PaymentListResponseDto {
  @ApiProperty({ description: 'List of payments', type: [PaymentResponseDto] })
  @ValidateNested({ each: true })
  @Type(() => PaymentResponseDto)
  payments!: PaymentResponseDto[];

  @ApiProperty({ description: 'Total funded amount', example: '1500.00' })
  @IsString()
  totalFunded!: string;

  @ApiProperty({ description: 'Total released amount', example: '0.00' })
  @IsString()
  totalReleased!: string;

  @ApiProperty({ description: 'Total pending amount', example: '1500.00' })
  @IsString()
  totalPending!: string;

  @ApiProperty({ description: 'Currency code', example: 'SAR' })
  @IsString()
  currency!: string;
}

export class FundMilestonePaymentDto {
  @ApiProperty({ description: 'Agreement identifier' })
  @IsUUID()
  agreementId!: string;

  @ApiProperty({ description: 'Milestone identifier' })
  @IsUUID()
  milestoneId!: string;

  @ApiProperty({ description: 'Amount in Decimal-safe string format' })
  @IsString()
  amount!: string;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  @MaxLength(10)
  currency!: string;
}
