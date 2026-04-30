import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { AgreementStatus } from '../../../common/enums/agreement-status.enum';

export type MilestoneResponseDto = Record<string, unknown>;
export type AgreementPolicyResponseDto = Record<string, unknown>;
export type ClientResponseDto = Record<string, unknown>;

export class AgreementResponseDto {
  @ApiProperty({
    description: 'Agreement unique identifier',
    example: 'clx...',
  })
  id: string;

  @ApiProperty({ description: 'Freelancer user ID who owns this agreement' })
  freelancerId: string;

  @ApiProperty({ description: 'Linked client ID', nullable: true })
  clientId: string | null;

  @ApiProperty({ description: 'Linked client summary', nullable: true })
  client: ClientResponseDto | null;

  @ApiProperty({
    description: 'Agreement title',
    example: 'تصميم موقع إلكتروني',
  })
  title: string;

  @ApiProperty({ description: 'Service scope description', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Service category', nullable: true })
  serviceType: string | null;

  @ApiProperty({
    description: 'Total agreement value — equals sum of milestone amounts',
    example: 5000,
  })
  @Transform(({ value }) => (value != null ? Number(value) : value))
  totalAmount: number;

  @ApiProperty({ description: 'Currency code', example: 'SAR' })
  currency: string;

  @ApiProperty({
    description: 'Human-readable project duration',
    nullable: true,
  })
  durationText: string | null;

  @ApiProperty({ description: 'Target completion date', nullable: true })
  expectedDeliveryDate: Date | null;

  @ApiProperty({
    description: 'Current lifecycle status',
    enum: AgreementStatus,
  })
  status: AgreementStatus;

  @ApiProperty({
    description: 'URL-safe invite token for client link',
    nullable: true,
  })
  inviteToken: string | null;

  @ApiProperty({ description: 'URL-safe portal access token', nullable: true })
  portalToken: string | null;

  @ApiProperty({
    description: 'When the client approved the agreement',
    nullable: true,
  })
  approvedAt: Date | null;

  @ApiProperty({
    description: 'When the invite was sent to the client',
    nullable: true,
  })
  sentAt: Date | null;

  @ApiProperty({ description: 'Record creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Agreement milestones ordered by position',
    type: 'array',
  })
  milestones: MilestoneResponseDto[];

  @ApiProperty({ description: 'Attached agreement policy', nullable: true })
  policy: AgreementPolicyResponseDto | null;
}
