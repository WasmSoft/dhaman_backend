# Dhaman Module Map

| Module | Responsibility | Depends On | Main Prisma Models | Main Endpoints | MVP Priority |
| --- | --- | --- | --- | --- | --- |
| Auth | Registration, login, current-user session context | Users, JWT config, common guards/errors | User, AuditLog | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | Phase 1 |
| Users | Freelancer profile and self-service account data | Auth, Prisma, settings | User, UserSettings | `GET /users/me`, `PATCH /users/me` | Phase 1 |
| Clients | Freelancer-owned client records | Auth, Prisma, timeline | Client, AuditLog | `GET /clients`, `POST /clients`, `GET /clients/:id`, `PATCH /clients/:id` | Phase 1 |
| Agreements | Agreement lifecycle and invitations | Clients, Policies, Milestones, Timeline, Email | Agreement, Client, TimelineEvent | `GET /agreements`, `POST /agreements`, `GET /agreements/:id`, `PATCH /agreements/:id` | Phase 2 |
| Agreement Policies | Agreement-level policies and review rules | Agreements, Prisma | AgreementPolicy | `GET /agreements/:agreementId/policies`, `PATCH /agreements/:agreementId/policies` | Phase 2 |
| Milestones | Scope breakdown, due dates, acceptance criteria | Agreements, Payments, Deliveries | Milestone | `GET /agreements/:agreementId/milestones`, `POST /agreements/:agreementId/milestones`, `PATCH /milestones/:id` | Phase 2 |
| Payments | Demo funding, reserve, release, receipt view | Agreements, Milestones, Change Requests | Payment | `GET /agreements/:agreementId/payments`, `POST /payments/fund-milestone`, `POST /payments/release` | Phase 3 |
| Deliveries | Delivery submissions and review transitions | Milestones, Agreements, AI Review | Delivery | `POST /milestones/:milestoneId/deliveries`, `GET /deliveries`, `GET /deliveries/:id` | Phase 3 |
| Timeline Events | Agreement activity feed | Agreements, Milestones | TimelineEvent | `GET /agreements/:agreementId/timeline` | Phase 3 |
| Client Portal | Secure token-based client flows | Agreements, Portal tokens, Payments, Deliveries | PortalToken, Agreement, Payment, Delivery | `GET /portal/:token`, `POST /portal/:token/approve` | Phase 4 |
| AI Plan | Draft payment plan generation support | Agreements, Milestones, AI integration | Agreement, Milestone | `POST /ai-plan/generate` | Phase 5 |
| AI Review | Dispute review and recommendation tracking | Deliveries, Milestones, Agreements | AIReview | `POST /ai-review`, `GET /ai-review`, `POST /ai-review/:id/accept-recommendation` | Phase 5 |
| Change Requests | Scope changes and related payment handling | Agreements, Milestones, Payments | ChangeRequest, Payment | `GET /change-requests`, `POST /change-requests`, `POST /change-requests/:id/pay` | Phase 5 |
| Email Notifications | Outbound email preview and dispatch orchestration | Agreements, Portal, Resend config | EmailNotification | `POST /email-notifications/preview`, `POST /email-notifications/send-test` | Phase 6 |
| Dashboard Analytics | Freelancer dashboard aggregates | Agreements, Payments, Deliveries | Agreement, Payment, Delivery | `GET /dashboard/overview` | Phase 6 |
| Settings | Freelancer defaults and preferences | Users, Prisma | UserSettings | `GET /settings`, `PATCH /settings` | Phase 6 |

## Shared Infrastructure

- `PrismaModule`: database access boundary
- `ErrorTranslatorModule`: centralized localized error translation
- `ClsModule`: request context propagation
- `common/interceptors`: response and logging policies
- `common/filters`: exception normalization and Prisma mapping
