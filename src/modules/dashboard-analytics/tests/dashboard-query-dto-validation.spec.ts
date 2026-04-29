import { TimelineEventType } from '../../../common/enums/timeline-event-type.enum';
import {
  DashboardActionsQueryDto,
  DashboardOverviewQueryDto,
  DashboardRecentActivityQueryDto,
} from '../dto';
import { validateDto } from './dashboard-dto-test-helpers';

function findError(properties: string[], property: string) {
  expect(properties).toContain(property);
}

function expectPropertyError(
  errors: import('class-validator').ValidationError[],
  property: string,
) {
  findError(
    errors.map((error) => error.property),
    property,
  );
}

describe('dashboard query DTO validation', () => {
  // DashboardOverviewQueryDto.range
  it('accepts omitted range (default 30d)', async () => {
    const errors = await validateDto(DashboardOverviewQueryDto, {});
    expect(errors).toHaveLength(0);
  });

  it('accepts range 7d', async () => {
    const errors = await validateDto(DashboardOverviewQueryDto, {
      range: '7d',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts range 30d', async () => {
    const errors = await validateDto(DashboardOverviewQueryDto, {
      range: '30d',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts range 90d', async () => {
    const errors = await validateDto(DashboardOverviewQueryDto, {
      range: '90d',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts range all', async () => {
    const errors = await validateDto(DashboardOverviewQueryDto, {
      range: 'all',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects range foo', async () => {
    const errors = await validateDto(DashboardOverviewQueryDto, {
      range: 'foo',
    });
    expectPropertyError(errors, 'range');
  });

  it('rejects range empty string', async () => {
    const errors = await validateDto(DashboardOverviewQueryDto, { range: '' });
    expectPropertyError(errors, 'range');
  });

  it('rejects range numeric 123', async () => {
    const errors = await validateDto(DashboardOverviewQueryDto, {
      range: 123,
    });
    expectPropertyError(errors, 'range');
  });

  // DashboardOverviewQueryDto.currency
  it('accepts omitted currency', async () => {
    const errors = await validateDto(DashboardOverviewQueryDto, {});
    expect(errors).toHaveLength(0);
  });

  it('accepts currency USD', async () => {
    const errors = await validateDto(DashboardOverviewQueryDto, {
      currency: 'USD',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects currency empty string', async () => {
    const errors = await validateDto(DashboardOverviewQueryDto, {
      currency: '',
    });
    expectPropertyError(errors, 'currency');
  });

  it('rejects currency numeric 123', async () => {
    const errors = await validateDto(DashboardOverviewQueryDto, {
      currency: 123,
    });
    expectPropertyError(errors, 'currency');
  });

  // DashboardActionsQueryDto.limit
  it('accepts omitted actions limit', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, {});
    expect(errors).toHaveLength(0);
  });

  it('accepts actions limit 1', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, { limit: 1 });
    expect(errors).toHaveLength(0);
  });

  it('accepts actions limit 50', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, { limit: 50 });
    expect(errors).toHaveLength(0);
  });

  it('rejects actions limit 0', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, { limit: 0 });
    expectPropertyError(errors, 'limit');
  });

  it('rejects actions limit 51', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, { limit: 51 });
    expectPropertyError(errors, 'limit');
  });

  it('rejects actions limit -1', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, { limit: -1 });
    expectPropertyError(errors, 'limit');
  });

  it('accepts actions limit string-coercible 10', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, { limit: '10' });
    expect(errors).toHaveLength(0);
  });

  it('rejects actions limit non-numeric string abc', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, {
      limit: 'abc',
    });
    expectPropertyError(errors, 'limit');
  });

  // DashboardActionsQueryDto.type
  it('accepts omitted actions type', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, {});
    expect(errors).toHaveLength(0);
  });

  it('accepts actions type payments', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, {
      type: 'payments',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts actions type deliveries', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, {
      type: 'deliveries',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts actions type ai_reviews', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, {
      type: 'ai_reviews',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts actions type change_requests', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, {
      type: 'change_requests',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts actions type all', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, { type: 'all' });
    expect(errors).toHaveLength(0);
  });

  it('rejects actions type foo', async () => {
    const errors = await validateDto(DashboardActionsQueryDto, { type: 'foo' });
    expectPropertyError(errors, 'type');
  });

  // DashboardRecentActivityQueryDto.limit
  it('accepts omitted recent activity limit', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {});
    expect(errors).toHaveLength(0);
  });

  it('accepts recent activity limit 1', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {
      limit: 1,
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts recent activity limit 50', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {
      limit: 50,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects recent activity limit 0', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {
      limit: 0,
    });
    expectPropertyError(errors, 'limit');
  });

  it('rejects recent activity limit 51', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {
      limit: 51,
    });
    expectPropertyError(errors, 'limit');
  });

  it('rejects recent activity limit -1', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {
      limit: -1,
    });
    expectPropertyError(errors, 'limit');
  });

  it('accepts recent activity limit string-coercible 10', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {
      limit: '10',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects recent activity limit non-numeric string abc', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {
      limit: 'abc',
    });
    expectPropertyError(errors, 'limit');
  });

  // DashboardRecentActivityQueryDto.agreementId
  it('accepts omitted agreementId', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {});
    expect(errors).toHaveLength(0);
  });

  it('accepts valid UUID agreementId', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {
      agreementId: '8d1a58a2-e89f-4a21-9b6e-becce6a1e985',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects non-UUID agreementId', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {
      agreementId: 'not-a-uuid',
    });
    expectPropertyError(errors, 'agreementId');
  });

  it('rejects empty string agreementId', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {
      agreementId: '',
    });
    expectPropertyError(errors, 'agreementId');
  });

  it('rejects numeric agreementId', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {
      agreementId: 123,
    });
    expectPropertyError(errors, 'agreementId');
  });

  // DashboardRecentActivityQueryDto.type
  it('accepts omitted recent activity type', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {});
    expect(errors).toHaveLength(0);
  });

  it('accepts each documented TimelineEventType value', async () => {
    const eventTypes = Object.values(TimelineEventType);
    for (const type of eventTypes) {
      const errors = await validateDto(DashboardRecentActivityQueryDto, {
        type,
      });
      expect(errors).toHaveLength(0);
    }
  });

  it('rejects unknown recent activity type foo', async () => {
    const errors = await validateDto(DashboardRecentActivityQueryDto, {
      type: 'foo',
    });
    expectPropertyError(errors, 'type');
  });
});
