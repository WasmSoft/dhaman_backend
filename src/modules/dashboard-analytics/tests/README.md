# Dashboard Analytics Tests

## Phase 1 Rule

Dashboard Analytics tests are mandatory in later implementation phases.

## Later Required Test Matrix

- Metric calculations for overview cards.
- Ownership scoping for authenticated freelancer reads.
- Validation failures for unsupported ranges and invalid limits.
- Error paths for unauthorized and inaccessible agreement requests.
- Decimal money values serialized as strings.
- Empty-state behavior with zero counts and empty lists.
- Cross-module seed scenarios for agreements, payments, deliveries, AI reviews, change requests, and timeline events.

## Spec File Index

| Spec File | Constitution Principle | Coverage |
|---|---|---|
| `dashboard-money-util.spec.ts` | SC-008 | Decimal precision boundaries, money-as-string serialization |
| `dashboard-service-overview-agreements.spec.ts` | SC-004 | Agreement status counts, total contract value (FR-001) |
| `dashboard-service-overview-payments.spec.ts` | SC-004, SC-008 | Payment status grouping, monetary assertions (FR-002, FR-003) |
| `dashboard-service-overview-range-empty.spec.ts` | FR-014 | Empty freelancer scenario, range filtering, unauthorized access |
| `dashboard-service-actions-payments-deliveries.spec.ts` | SC-004 | Action classification for payments and deliveries (FR-004) |
| `dashboard-service-actions-ai-change-requests.spec.ts` | SC-004 | Action classification for AI reviews and change requests (FR-004) |
| `dashboard-service-actions-filter-limit.spec.ts` | FR-004, FR-006 | Type filter narrowing, limit boundary enforcement [1, 50] |
| `dashboard-service-recent-activity-owned-order.spec.ts` | SC-004 | Most-recent-first ordering, limit respect (FR-005) |
| `dashboard-service-recent-activity-agreement-filter.spec.ts` | FR-009 | Owned agreement filtering, cross-tenant scoping |
| `dashboard-service-recent-activity-type-limit.spec.ts` | FR-005, FR-006 | TimelineEventType filters, limit boundaries |
| `dashboard-query-dto-validation.spec.ts` | SC-003, FR-006 | DTO validation matrix coverage for all query fields |
| `dashboard-response-contract.spec.ts` | SC-008 | Money-string guard regression test (FR-003) |
| `dashboard-error-translation.spec.ts` | SC-009, FR-012 | Localized error codes in en and ar for all five dashboard errors |
| `dashboard-integration-seed.spec.ts` | FR-013 | End-to-end seeded scenario across all three endpoints |
| `dashboard-aggregation-readiness.spec.ts` | SC-004 | N+1 and index readiness verification |
| `dashboard-source-field-map.spec.ts` | SC-004 | Source field mapping contract validation |
| `dashboard-response-dto.spec.ts` | SC-008 | Response DTO shape contracts |
| `dashboard-swagger-contract.spec.ts` | SC-008 | Swagger annotation contracts |
| `dashboard-swagger-examples.spec.ts` | SC-008 | Swagger example shape validation |
| `dashboard-service-test-helpers.ts` | — | Shared fixture builders and test utilities |
| `dashboard-dto-test-helpers.ts` | — | DTO validation helpers, translation registry reader, money assertions |
