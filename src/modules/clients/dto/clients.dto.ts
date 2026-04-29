import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AgreementStatus } from '@prisma/client';

export class CreateClientDto {
  @ApiProperty({
    description: 'Full name of the client',
    example: 'شركة التقنية',
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Client email address — used for portal invites',
    example: 'client@example.sa',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Optional phone number',
    example: '+966501234567',
    required: false,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    description: 'Optional company or organization name',
    example: 'شركة التقنية للحلول',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;
}

export class UpdateClientDto {
  @ApiProperty({
    description: 'Updated full name',
    example: 'شركة التقنية المتقدمة',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Updated email address',
    example: 'updated@example.sa',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Updated phone number',
    example: '+966509876543',
    required: false,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    description: 'Updated company or organization name',
    example: 'المجموعة التقنية',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;
}

export class ClientQueryDto {
  @ApiProperty({
    description:
      'Search across name, email, and company name (case-insensitive)',
    example: 'تقنية',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Page number (1-indexed)',
    example: 1,
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Records per page',
    example: 20,
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ClientResponseDto {
  @ApiProperty({
    description: 'Client unique identifier',
    example: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({ description: 'Client full name', example: 'شركة التقنية' })
  name: string;

  @ApiProperty({
    description: 'Client email address',
    example: 'client@example.sa',
  })
  email: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+966501234567',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: 'Company or organization name',
    example: 'شركة التقنية للحلول',
    nullable: true,
  })
  companyName: string | null;

  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2026-04-29T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-04-29T10:00:00.000Z',
  })
  updatedAt: Date;
}

export class ClientListResponseDto {
  @ApiProperty({
    type: [ClientResponseDto],
    description: 'Page of client records',
  })
  data: ClientResponseDto[];

  @ApiProperty({
    description: 'Total matching records across all pages',
    example: 42,
  })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Records per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 3 })
  totalPages: number;
}

export class AgreementsByStatusDto {
  @ApiProperty({ description: 'Total number of agreements', example: 5 })
  total: number;

  @ApiProperty({
    description: 'Agreement count grouped by status',
    example: { DRAFT: 1, ACTIVE: 3, COMPLETED: 1 },
  })
  byStatus: Record<AgreementStatus, number>;
}

export class PaymentSummaryDto {
  @ApiProperty({
    description: 'Total milestone amount across all agreements',
    example: 50000,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Sum of released milestone amounts',
    example: 30000,
  })
  releasedAmount: number;

  @ApiProperty({
    description: 'Sum of pending milestone amounts',
    example: 20000,
  })
  pendingAmount: number;

  @ApiProperty({ description: 'Currency code (ISO 4217)', example: 'SAR' })
  currency: string;
}

export class RecentAgreementDto {
  @ApiProperty({
    description: 'Agreement identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Agreement title',
    example: 'تصميم موقع إلكتروني',
  })
  title: string;

  @ApiProperty({
    enum: AgreementStatus,
    description: 'Current agreement status',
    example: 'ACTIVE',
  })
  status: AgreementStatus;

  @ApiProperty({ description: 'Total agreement amount', example: 15000 })
  totalAmount: number;

  @ApiProperty({
    description: 'Agreement creation date',
    example: '2026-04-01T00:00:00.000Z',
  })
  createdAt: Date;
}

export class ClientSummaryResponseDto {
  @ApiProperty({
    type: () => ClientResponseDto,
    description: 'The client record',
  })
  client: ClientResponseDto;

  @ApiProperty({
    type: () => AgreementsByStatusDto,
    description: 'Agreement counts',
  })
  agreements: AgreementsByStatusDto;

  @ApiProperty({ type: () => PaymentSummaryDto, description: 'Payment totals' })
  payments: PaymentSummaryDto;

  @ApiProperty({
    type: [RecentAgreementDto],
    description: 'Up to 5 most recent agreements for this client',
  })
  recentAgreements: RecentAgreementDto[];
}
