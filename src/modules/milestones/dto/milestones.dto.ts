import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MilestoneStatus } from '../../../common/enums/milestone-status.enum';

export class CreateMilestoneDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  amount!: string;

  @IsString()
  @MaxLength(10)
  currency!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsInt()
  @Min(1)
  order!: number;

  @IsObject()
  acceptanceCriteria!: Record<string, unknown>;
}

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateMilestoneStatusDto {
  @IsEnum(MilestoneStatus)
  status!: MilestoneStatus;
}
