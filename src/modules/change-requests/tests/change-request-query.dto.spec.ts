import { ChangeRequestStatus } from '@prisma/client';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ChangeRequestQueryDto } from '../dto/change-request-query.dto';

describe('ChangeRequestQueryDto', () => {
  it('should validate an empty query object', async () => {
    const dto = plainToInstance(ChangeRequestQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate a valid status enum value', async () => {
    const dto = plainToInstance(ChangeRequestQueryDto, {
      status: ChangeRequestStatus.APPROVED,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject an invalid status string', async () => {
    const dto = plainToInstance(ChangeRequestQueryDto, {
      status: 'INVALID_STATUS',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });

  it('should validate a valid agreementId UUID', async () => {
    // agreementId is not in the DTO, but milestoneId is
    const dto = plainToInstance(ChangeRequestQueryDto, {
      milestoneId: '123e4567-e89b-12d3-a456-426614174000',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject a non-UUID milestoneId', async () => {
    const dto = plainToInstance(ChangeRequestQueryDto, {
      milestoneId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'milestoneId')).toBe(true);
  });

  it('should validate valid page and limit integers', async () => {
    const dto = plainToInstance(ChangeRequestQueryDto, {
      page: 1,
      limit: 20,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept a valid UUID milestoneId and status combination', async () => {
    const dto = plainToInstance(ChangeRequestQueryDto, {
      status: ChangeRequestStatus.SENT,
      milestoneId: '123e4567-e89b-12d3-a456-426614174000',
      page: 2,
      limit: 50,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
