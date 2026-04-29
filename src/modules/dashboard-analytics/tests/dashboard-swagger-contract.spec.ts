import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DashboardOverviewEnvelopeDto,
  DashboardOverviewQueryDto,
} from '../dto';
import { DashboardAnalyticsController } from '../dashboard-analytics.controller';

describe('dashboard swagger contract', () => {
  it('exports the controller and overview DTO classes', () => {
    expect(DashboardAnalyticsController).toBeDefined();
    expect(DashboardOverviewQueryDto).toBeDefined();
    expect(DashboardOverviewEnvelopeDto).toBeDefined();
  });

  it('documents the overview endpoint with the required Swagger decorators', () => {
    const controllerSource = readFileSync(
      join(__dirname, '..', 'dashboard-analytics.controller.ts'),
      'utf8',
    );

    expect(controllerSource).toContain('@ApiTags(');
    expect(controllerSource).toContain('@ApiBearerAuth()');
    expect(controllerSource).toContain('@ApiOperation(');
    expect(controllerSource).toContain('@ApiQuery(');
    expect(controllerSource).toContain('@ApiOkResponse(');
    expect(controllerSource).toMatch(/@ApiResponse\(\{\s+status:\s+400,/);
    expect(controllerSource).toMatch(/@ApiResponse\(\{\s+status:\s+401,/);
    expect(controllerSource).toMatch(/@ApiResponse\(\{\s+status:\s+500,/);
    expect(controllerSource).toContain('DashboardOverviewEnvelopeDto');
  });
});
