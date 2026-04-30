import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PortalDeclineChangeRequestDto } from '../dto/portal-decline-change-request.dto';

describe('PortalDeclineChangeRequestDto', () => {
  it('should validate a valid reason within bounds', async () => {
    const dto = plainToInstance(PortalDeclineChangeRequestDto, {
      reason: 'The extra pages are not needed for this phase.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject reason shorter than 10 characters', async () => {
    const dto = plainToInstance(PortalDeclineChangeRequestDto, {
      reason: 'Too short',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'reason')).toBe(true);
  });

  it('should reject reason longer than 2000 characters', async () => {
    const dto = plainToInstance(PortalDeclineChangeRequestDto, {
      reason: 'A'.repeat(2001),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'reason')).toBe(true);
  });

  it('should reject absent reason', async () => {
    const dto = plainToInstance(PortalDeclineChangeRequestDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'reason')).toBe(true);
  });
});
