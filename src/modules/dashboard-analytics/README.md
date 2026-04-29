# Dashboard Analytics Module

## References

- Backend rules: `backend/AGENTS_BACKEND.md`
- Module plan: `docs/backend-module-plans/16_DASHBOARD_ANALYTICS_MODULE.md`
- Current feature plan: `specs/004-dashboard-controller-endpoints/plan.md`

## Phase 1 Guardrails

- This phase is read-only planning and type work only.
- Do not create `backend/prisma/schema/dashboard-analytics.prisma`.
- Do not create Prisma migrations.
- Do not create dashboard cache tables.
- Do not create dashboard reporting tables.
- Do not add controller endpoint logic in this phase.
- Do not add service aggregation logic in this phase.
- Do not add frontend integration in this phase.

## Source Coverage

| Source Domain  | Purpose                                                   | Fields Used                                                                                                                                                              | Index Readiness                                                                                                             |
| -------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Agreement      | Counts, active cards, total contract value                | `id`, `freelancerId`, `clientId`, `title`, `totalAmount`, `currency`, `status`, `createdAt`, `updatedAt`                                                                 | Existing `freelancerId`, `clientId`, and `status` indexes support ownership and status filters                              |
| Client         | Client counts and display context                         | `id`, `freelancerId`, `name`, `email`, `createdAt`                                                                                                                       | Existing `freelancerId` index and unique `freelancerId/email` constraint support scoped reads                               |
| Milestone      | Progress, due work, payment and delivery status           | `id`, `agreementId`, `title`, `amount`, `currency`, `status`, `paymentStatus`, `deliveryStatus`, `dueDate`, `order`, `createdAt`, `updatedAt`                            | Existing `agreementId`, `status`, and unique `agreementId/order` support scoped progress reads                              |
| Payment        | Protected, pending, released, and ready-to-release totals | `id`, `agreementId`, `milestoneId`, `changeRequestId`, `amount`, `currency`, `status`, `operationType`, `demoMode`, `reservedAt`, `releasedAt`, `createdAt`, `updatedAt` | Existing relationship and `status` indexes support summary filters; MVP uses only `demoMode = true`                         |
| Delivery       | In-review and changes-requested work                      | `id`, `agreementId`, `milestoneId`, `status`, `submittedAt`, `createdAt`, `updatedAt`                                                                                    | Existing relation indexes exist; status index is not present and should be measured later before proposing schema changes   |
| AI Review      | Review counts and recommendation context                  | `id`, `agreementId`, `milestoneId`, `deliveryId`, `status`, `recommendation`, `matchScore`, `createdAt`, `updatedAt`                                                     | Existing `agreementId`, `milestoneId`, and `status` indexes support summaries                                               |
| Change Request | Pending, approved, declined, and paid extra work          | `id`, `agreementId`, `milestoneId`, `title`, `amount`, `currency`, `status`, `paymentStatus`, `createdAt`, `updatedAt`                                                   | Existing `agreementId`, `milestoneId`, and `status` indexes support filters                                                 |
| Timeline Event | Recent activity feed                                      | `id`, `agreementId`, `milestoneId`, `type`, `title`, `description`, `actorRole`, `actorId`, `metadata`, `createdAt`                                                      | Existing `agreementId`, `milestoneId`, `actorId`, and `type` indexes support filtering; later ordering may need measurement |

## Response Contracts

| Type File                                                                            | Purpose                                                                         |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `backend/src/modules/dashboard-analytics/types/dashboard-query.types.ts`             | Allowed dashboard filter values and defaults                                    |
| `backend/src/modules/dashboard-analytics/types/dashboard-summary.types.ts`           | Shared metric, payment, agreement, AI review, and change request summary shapes |
| `backend/src/modules/dashboard-analytics/types/dashboard-overview-response.types.ts` | Overview response required keys and type boundary                               |
| `backend/src/modules/dashboard-analytics/types/dashboard-action-required.types.ts`   | Action-required item and list response shapes                                   |
| `backend/src/modules/dashboard-analytics/types/dashboard-recent-activity.types.ts`   | Recent activity item and list response shapes                                   |

## Phase 2 Handoff

- The next allowed phase is DTO and Swagger work only.
- Frontend integration remains forbidden until the final approved phase.

## Phase 2 Implementation

- Query DTOs validate supported filters for overview, actions-required, and recent activity.
- Response DTOs document stable payload shapes for overview cards, action-required items, and recent activity.
- Swagger examples document success envelopes, empty states, exact money strings, and major error outcomes.
- All documented data remains scoped to authenticated freelancers.
- Service aggregation logic remains a later Phase 3 responsibility.

## Phase 3 Implementation

- `DashboardAnalyticsService` now reads owned source-of-truth data through `PrismaService` only.
- Overview aggregation returns agreement, payment, AI review, and change request summaries with exact money strings.
- Actions-required aggregation returns owned payment, delivery, AI review, and change request items only.
- Recent activity reads owned `TimelineEvent` records newest-first and checks optional owned `agreementId` access before querying details.
- Missing dashboard auth context returns `UNAUTHORIZED`.
- Unexpected service failures are wrapped as `DASHBOARD_AGGREGATION_FAILED`.
- No controller auth wiring, frontend integration, Prisma schema changes, timeline creation, payment transitions, email sends, or AI calls were added in this phase.

## Phase 4 Implementation

- `DashboardAnalyticsController` now wires `GET /dashboard/overview`, `GET /dashboard/actions-required`, and `GET /dashboard/recent-activity` to the Phase 3 service methods.
- JWT freelancer authentication is applied at the controller boundary with `JwtAuthGuard`.
- Swagger documents query parameters, success envelopes, and 400/401/404/500 error responses for the dashboard endpoints.
- Controllers remain thin and do not perform Prisma reads, business transitions, timeline creation, payment changes, email sends, AI calls, or frontend integration.

## Forbidden File Check

- `backend/prisma/schema/dashboard-analytics.prisma`: not present.
- `backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts`: present and updated only for Phase 4 endpoint/auth/Swagger wiring.
- `backend/src/modules/dashboard-analytics/dashboard-analytics.service.ts`: present and unchanged in this phase.
