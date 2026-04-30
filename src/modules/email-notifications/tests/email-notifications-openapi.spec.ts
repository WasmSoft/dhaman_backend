import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('email notifications OpenAPI contract verification', () => {
  const repoRoot = join(__dirname, '..', '..', '..', '..', '..');
  const quickstartMd = readFileSync(
    join(repoRoot, 'specs', '002-email-dtos-swagger', 'quickstart.md'),
    'utf8',
  );

  it('references the OpenAPI contract as an implementation artifact', () => {
    const contractPath = join(
      repoRoot,
      'specs',
      '002-email-dtos-swagger',
      'contracts',
      'email-notifications.openapi.yaml',
    );
    const contract = readFileSync(contractPath, 'utf8');
    expect(contract).toContain('openapi:');
    expect(contract).toContain('Email Notifications');
  });

  it('quickstart lists all four operations', () => {
    expect(quickstartMd).toContain('/email-notifications/preview');
    expect(quickstartMd).toContain('/emails/logs');
    expect(quickstartMd).toContain('/agreements/:id/resend-invite');
    expect(quickstartMd).toContain('/notifications/test');
  });

  it('quickstart requires DTO validation tests', () => {
    expect(quickstartMd).toContain('Invalid notification type');
    expect(quickstartMd).toContain('Invalid notification status');
    expect(quickstartMd).toContain('Page below `1`');
    expect(quickstartMd).toContain('Limit below `1` or above `100`');
  });
});
