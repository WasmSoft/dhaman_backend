# Dhaman Backend Agent Rules

These rules must be followed by every AI agent, developer, or team member working on the Dhaman backend.

The purpose of this file is to keep the backend architecture clean, modular, scalable, testable, documented, localized, and easy to integrate with the frontend.

This backend rules file is adapted from the existing frontend `AGENTS.md` style, but it is specific to NestJS, Prisma, PostgreSQL, Swagger, CLS/request context, and backend module delivery.

---

## 1. Core Backend Architecture

This project uses:

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Modular architecture
- REST API
- Swagger/OpenAPI
- CLS / request context
- Centralized error translation
- DTO validation
- Jest tests
- Demo payment mode for MVP

Approved backend structure:

```txt
project-root/
  prisma/
    schema/
      base.prisma
      auth.prisma
      users.prisma
      clients.prisma
      agreements.prisma
      agreement-policies.prisma
      milestones.prisma
      payments.prisma
      deliveries.prisma
      client-portal.prisma
      ai-plan.prisma
      ai-review.prisma
      change-requests.prisma
      timeline-events.prisma
      email-notifications.prisma
      settings.prisma
      audit-log.prisma

  src/
    main.ts
    app.module.ts

    common/
      cls/
      decorators/
      dto/
      enums/
      errors/
      filters/
      guards/
      interceptors/
      pipes/
      types/
      utils/

    config/

    infrastructure/
      prisma/

    modules/
      auth/
      users/
      clients/
      agreements/
      agreement-policies/
      milestones/
      payments/
      deliveries/
      client-portal/
      ai-plan/
      ai-review/
      change-requests/
      timeline-events/
      email-notifications/
      dashboard-analytics/
      settings/

    test/

  docs/
```

Rules:

1. `src/modules` is the only place for domain modules.
2. `src/common` is for shared cross-cutting backend utilities.
3. `src/infrastructure` is for technical infrastructure adapters such as Prisma.
4. `src/config` is for environment and runtime configuration.
5. `docs` is for architecture, API maps, error cases, implementation phases, and module notes.
6. Do not place module-specific business logic inside `main.ts`, `app.module.ts`, or `common`.
7. Do not place Prisma models randomly inside one huge schema file.
8. Do not implement frontend integration until the dedicated integration phase.
9. Do not implement real payment provider logic in the MVP. Payments are demo/simulation only.
10. Do not call Gemini, Resend, or storage providers before their modules are intentionally implemented.

---

## 2. Prisma Multi-File Schema Rules

Dhaman must use a modular Prisma schema folder.

The Prisma schema must be split by domain/module inside:

```txt
prisma/schema/
```

Do not keep the entire schema in one huge `prisma/schema.prisma` file.

Approved structure:

```txt
prisma/schema/
  base.prisma
  auth.prisma
  users.prisma
  clients.prisma
  agreements.prisma
  agreement-policies.prisma
  milestones.prisma
  payments.prisma
  deliveries.prisma
  client-portal.prisma
  ai-review.prisma
  change-requests.prisma
  timeline-events.prisma
  email-notifications.prisma
  settings.prisma
  audit-log.prisma
```

### 2.1 Main schema file

Use `base.prisma` as the obvious main schema file.

`base.prisma` contains only:

- generator block
- datasource block
- shared enums if they are truly global

Example:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Rules:

1. Keep generator and datasource in `base.prisma`.
2. Domain models must live in their related `.prisma` file.
3. Keep enum definitions close to the domain if possible.
4. If an enum is used across many modules, place it in `base.prisma` or a clearly named shared schema file.
5. Do not duplicate enum names.
6. Do not duplicate relation names.
7. Every Prisma model must include `createdAt` and `updatedAt` unless it is intentionally immutable such as timeline events.
8. Use `Decimal` for money.
9. Use `Json` for flexible criteria, AI raw output, and metadata.
10. Add indexes for foreign keys and common filters.
11. Use clear relation names when multiple relations exist between the same models.
12. Keep Prisma schema files formatted with `npx prisma format`.

### 2.2 Prisma CLI rules

When using multi-file schema, always run Prisma commands against the schema folder if needed:

```bash
npx prisma format --schema prisma/schema
npx prisma generate --schema prisma/schema
npx prisma migrate dev --schema prisma/schema --name init
```

If the installed Prisma version auto-detects `prisma/schema`, still prefer explicit commands in scripts for clarity.

Recommended `package.json` scripts:

```json
{
  "scripts": {
    "prisma:format": "prisma format --schema prisma/schema",
    "prisma:generate": "prisma generate --schema prisma/schema",
    "prisma:migrate": "prisma migrate dev --schema prisma/schema",
    "prisma:studio": "prisma studio --schema prisma/schema"
  }
}
```

Rules:

1. Do not create both `prisma/schema.prisma` and `prisma/schema/` unless the project has intentionally configured that pattern.
2. If both exist accidentally, stop and ask before changing.
3. Do not run migration before reviewing generated schema changes.
4. Do not push migrations that include accidental model deletions.
5. Do not use `Float` for payment amounts.

---

## 3. NestJS Module Rules

Every domain module must follow this structure:

```txt
src/modules/{module-name}/
  dto/
  tests/
  {module-name}.module.ts
  {module-name}.controller.ts
  {module-name}.service.ts
```

Recommended additional folders when needed:

```txt
src/modules/{module-name}/
  constants/
  types/
  validators/
  helpers/
```

Rules:

1. Every module must have a clear responsibility.
2. A module must not directly own another module's business rules.
3. Services contain business logic.
4. Controllers only handle HTTP request/response boundaries.
5. DTOs validate input.
6. Prisma access should go through the service layer.
7. Do not call Prisma directly from controllers.
8. Do not call external APIs directly from controllers.
9. Do not create circular module dependencies.
10. Use dependency injection.
11. Export services only when another module needs them.
12. Keep services focused and testable.
13. Add bilingual comments for non-obvious functions.

---

## 4. Required Dhaman Modules

The backend must include these modules:

```txt
auth
users
clients
agreements
agreement-policies
milestones
payments
deliveries
client-portal
ai-plan
ai-review
change-requests
timeline-events
email-notifications
dashboard-analytics
settings
```

### Module responsibility map

| Module | Responsibility |
|---|---|
| Auth | Freelancer login/register/JWT and auth guards |
| Users | Freelancer profile and user account data |
| Clients | Client records attached to freelancer agreements |
| Agreements | Main agreement lifecycle |
| Agreement Policies | Delay, cancellation, extra request, and review policies |
| Milestones | Project phases, amounts, criteria, order, status |
| Payments | Demo protected payment lifecycle |
| Deliveries | Delivery submission, links, files, review state |
| Client Portal | Token-based client access and client actions |
| AI Plan | Gemini-generated payment plan draft |
| AI Review | Dispute analysis and recommendation |
| Change Requests | Out-of-scope work requests and payments |
| Timeline Events | Evidence timeline and audit-style activity history |
| Email Notifications | Resend templates, previews, and send records |
| Dashboard Analytics | Freelancer dashboard summaries |
| Settings | User defaults, policies, notification preferences |

Rules:

1. Every module must document its purpose in a file comment or module README comment.
2. Every module must document its main endpoints.
3. Every module must document success and error cases.
4. Every module must document expected timeline events.
5. Every module must document test cases.
6. Every module must stop after each phase and ask before continuing.

### 4.1 Milestones Module Implementation Rules

Milestones are agreement-scoped and payment-coupled. Before implementing or changing the
Milestones module, read `docs/backend-module-plans/07_MILESTONES_MODULE.md` and apply these
rules as phase gates:

1. Implement and verify all six endpoints: create, update, delete, reorder, get one, and
   list by agreement under `/api/v1`.
2. Scope every read and mutation through the parent `Agreement` owner, even when the route
   starts with `milestoneId`.
3. Allow create, update, delete, and reorder only for `DRAFT` and `PENDING_APPROVAL`
   agreements. Use Change Requests after activation.
4. Keep `orderIndex` as the API field and map it internally to Prisma `order`.
5. Reject empty acceptance criteria and default missing `required` values consistently.
6. Inherit currency from the agreement and use Decimal-safe amount handling.
7. Return the documented `amountWarning` when milestone totals differ from agreement total.
8. Create, sync, and delete milestone payments only through `PaymentsService` or the
   approved payment service method; never update payment status directly from Milestones.
9. Wrap milestone plus payment writes and reorder writes in transactions.
10. Treat reorder as a full replacement: every milestone included, unique contiguous order
    values from `1`, and no silent auto-adjustment.
11. Emit milestone timeline events with actor, agreement, milestone, and safe metadata.
12. Finish Swagger, centralized EN/AR errors, DTO tests, service tests, integration tests,
    and scenario coverage before marking the phase complete.

---

## 5. Controller Rules

Controllers must be thin.

Rules:

1. Use `@Controller()` with clear route prefixes.
2. Use DTOs for all body payloads.
3. Use `@Param`, `@Query`, and `@Body` cleanly.
4. Do not put business logic in controllers.
5. Do not put Prisma queries in controllers.
6. Do not manually format success responses if the response envelope interceptor handles it.
7. Every endpoint must have Swagger decorators.
8. Every endpoint must define expected response type if available.
9. Every endpoint must document auth requirements.
10. Every endpoint must document major error cases.
11. Every endpoint should return service results only.

Swagger required decorators:

- `@ApiTags`
- `@ApiOperation`
- `@ApiResponse`
- `@ApiBearerAuth` when authenticated
- `@ApiParam` where path params exist
- `@ApiQuery` where filters exist
- `@ApiBody` where request body exists

---

## 6. Service Rules

Services contain business logic.

Rules:

1. Every public service method must have a bilingual comment.
2. Every service method must have a single clear purpose.
3. Use `AppException` for business errors.
4. Do not throw raw strings.
5. Do not hardcode Arabic error messages in services.
6. Use error codes from `ErrorCode`.
7. Validate business state transitions.
8. Create timeline events for important domain changes.
9. Do not call email or AI services inline unless the module phase requires it.
10. Side effects must be explicit and documented.
11. Keep methods small.
12. Prefer private helper methods for repeated internal checks.
13. Add unit tests for important business rules.

Function comment example:

```ts
// AR: يتحقق من أن الاتفاق في حالة تسمح بتعديل السياسات.
// EN: Ensures the agreement is in a state that allows policy updates.
private ensureAgreementCanUpdatePolicies(status: AgreementStatus) {
  // Implementation
}
```

---

## 7. DTO and Validation Rules

All request payloads must use DTOs.

Rules:

1. DTOs live in `src/modules/{module}/dto`.
2. Use `class-validator`.
3. Use `class-transformer` when transformation is needed.
4. Use `@ApiProperty` and `@ApiPropertyOptional` for Swagger.
5. Validate UUIDs with `@IsUUID()`.
6. Validate enums with `@IsEnum()`.
7. Validate money as string or Decimal-compatible input. Do not use unsafe floats.
8. Validate arrays and nested objects carefully.
9. Do not accept arbitrary JSON unless the field is intentionally flexible.
10. Add DTO tests for important validation rules.

DTO naming:

```txt
create-agreement.dto.ts
update-agreement.dto.ts
send-invite.dto.ts
fund-milestone-payment.dto.ts
create-ai-review.dto.ts
```

---

## 8. Swagger Documentation Rules

Swagger documentation is mandatory.

Rules:

1. Every endpoint must be visible in Swagger.
2. Every endpoint must have a clear summary.
3. Every endpoint must describe what it does.
4. Every request DTO must use Swagger decorators.
5. Every response DTO should use Swagger decorators when stable.
6. Every endpoint must document major error responses.
7. Do not leave undocumented endpoints.
8. Do not expose internal implementation details.
9. Swagger must be available at `/docs`.
10. Swagger title must be `Dhaman MVP API`.

Example:

```ts
@ApiTags("Agreements")
@ApiBearerAuth()
@ApiOperation({
  summary: "Create agreement draft",
  description: "Creates a draft payment agreement for a freelancer and client.",
})
@ApiResponse({ status: 201, description: "Agreement draft created." })
@ApiResponse({ status: 400, description: "Validation error." })
@ApiResponse({ status: 401, description: "Unauthorized." })
@Post()
create(@Body() dto: CreateAgreementDto) {
  return this.agreementsService.create(dto);
}
```

---

## 9. CLS / Request Context Rules

Every request must have a request context.

Required context fields:

- requestId
- correlationId
- userId if authenticated
- userRole if authenticated
- actorType
- portalTokenId if client portal request
- agreementId if available
- locale
- startedAt

Files:

```txt
src/common/cls/
  cls.module.ts
  cls.service.ts
  request-context.type.ts
  request-context.middleware.ts
  request-id.util.ts
```

Rules:

1. If `x-request-id` exists, reuse it.
2. If missing, generate a request ID.
3. If `x-correlation-id` exists, reuse it.
4. If missing, use requestId as correlationId.
5. Attach requestId to every error response.
6. Attach requestId to every success response meta.
7. Use requestId in logs.
8. Store locale in request context.
9. Locale defaults to Arabic unless configured otherwise.
10. Client portal token requests must set actorType to `CLIENT_PORTAL`.

---

## 10. Error Handling and Translation Rules

All API errors must follow one unified shape.

Error response shape:

```json
{
  "success": false,
  "error": {
    "code": "AGREEMENT_NOT_FOUND",
    "message": "Agreement not found",
    "localizedMessage": "لم يتم العثور على الاتفاق",
    "details": {},
    "fieldErrors": [],
    "requestId": "req_xxx",
    "timestamp": "2026-04-28T00:00:00.000Z",
    "path": "/api/v1/agreements/xxx",
    "method": "GET"
  }
}
```

Rules:

1. Use `AppException` for known business errors.
2. Use central `ErrorTranslatorService`.
3. Do not hardcode translated strings in services.
4. Store English messages in `error-messages.en.ts`.
5. Store Arabic messages in `error-messages.ar.ts`.
6. If a translation is missing, fallback to English.
7. If the error code is unknown, fallback to `INTERNAL_SERVER_ERROR`.
8. Do not expose stack traces to API clients.
9. Prisma errors must be mapped by `PrismaExceptionFilter`.
10. Validation errors must produce fieldErrors.

Required error folders:

```txt
src/common/errors/
  app-exception.ts
  error-code-map.ts
  error-translator.service.ts
  error-translator.module.ts
  error-messages.ar.ts
  error-messages.en.ts
```

---

## 11. Endpoint Error Case Rules

Every endpoint must document its error cases.

For every endpoint, document:

- success case
- validation error case
- auth error case
- permission error case
- not found case
- conflict/business rule case
- side effects
- timeline events created
- email notifications triggered
- payment status changes
- AI calls if any
- test cases

Documentation file:

```txt
docs/endpoint-error-cases.md
```

Rules:

1. Do not add an endpoint without documenting its errors.
2. Do not add a business rule without documenting its test cases.
3. Keep error docs updated when behavior changes.

---

## 12. Response Envelope Rules

Success response shape:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_xxx"
  }
}
```

Rules:

1. Use `ResponseEnvelopeInterceptor`.
2. Do not manually wrap responses in every controller.
3. Include requestId in response meta.
4. Pagination responses must include pagination metadata.
5. File downloads may bypass the envelope if necessary and documented.

---

## 13. Testing Rules

Testing is required for important behavior.

Test location:

```txt
src/test/
```

Recommended structure:

```txt
src/test/
  auth/
  agreements/
  payments/
  deliveries/
  ai-review/
  common/
```

Rules:

1. Add tests for services with important business rules.
2. Add tests for DTO validation when important.
3. Add tests for error translation.
4. Add tests for Prisma error mapping.
5. Add tests for payment state transitions.
6. Add tests for agreement state transitions.
7. Add tests for AI review decision mapping.
8. Add tests for endpoint error cases when possible.
9. Do not skip tests for critical payment, agreement, delivery, or AI review behavior.
10. Do not test NestJS internals.
11. Test our wrappers, business rules, and transformations.

---

## 14. Payment MVP Rules

Payments are simulation-only in this MVP.

Rules:

1. Do not integrate Stripe, PayPal, bank APIs, or real payment providers unless explicitly requested.
2. Keep `PAYMENT_MODE=demo`.
3. Use clear demo fields such as `demoMode`.
4. Do not imply legal escrow.
5. Payment statuses must follow Dhaman product states:
   - Waiting
   - Reserved
   - Client Review
   - AI Review
   - Ready to Release
   - Released
   - On Hold
6. Every payment state transition must create a timeline event.
7. Every release decision must be traceable.
8. Change Request payments must be separate from original milestone payments.

---

## 15. Timeline Event Rules

Timeline events represent evidence.

Rules:

1. Create timeline events for important state changes.
2. Do not create noisy events for every small read action.
3. Timeline events should include actorRole, title, description, and metadata.
4. Important payment, delivery, agreement, AI review, and change request actions must create timeline events.
5. Keep event titles human-readable.
6. Keep event metadata structured.

Examples:

- AGREEMENT_CREATED
- AGREEMENT_SENT
- AGREEMENT_APPROVED
- MILESTONE_STARTED
- PAYMENT_RESERVED
- DELIVERY_SUBMITTED
- DELIVERY_ACCEPTED
- AI_REVIEW_OPENED
- AI_REVIEW_COMPLETED
- CHANGE_REQUEST_CREATED

---

## 16. Email Notification Rules

Email uses Resend later, but must be abstracted.

Rules:

1. Do not call Resend directly from random modules.
2. Use `EmailNotificationsService`.
3. Store email attempts in `EmailNotification`.
4. Support preview mode.
5. Do not block core business flows on optional email failure unless required.
6. Email sending must be documented as a side effect.
7. Every email type must have a template name and notification type.

---

## 17. AI Integration Rules

AI uses Gemini later, but must be abstracted.

Rules:

1. Do not call Gemini directly from controllers.
2. Use `AiPlanService` and `AiReviewService`.
3. Always support mock/fallback responses for demo stability.
4. Store raw AI response in JSON when relevant.
5. Validate AI output before saving.
6. Do not trust AI output blindly.
7. Map AI failures to stable error codes.
8. Document AI prompt inputs and outputs.
9. AI Review must use agreement policies, milestone criteria, delivery evidence, and objection text.

---

## 18. Client Portal Rules

Client portal uses secure tokens.

Rules:

1. Client portal endpoints use token-based access.
2. Do not require full client login in MVP.
3. Validate portal token on every portal request.
4. Expired or revoked tokens must fail clearly.
5. Portal actions must be limited to the agreement attached to the token.
6. Do not allow portal token to access freelancer dashboard endpoints.
7. Portal errors must use localized messages.
8. Portal access should set actorType to `CLIENT_PORTAL`.

---

## 19. Frontend Integration Rules

Do not integrate with frontend until the dedicated integration phase.

When integration phase starts:

1. Stop first and ask: "Is the frontend ready for integration?"
2. Inspect frontend routes.
3. Inspect API client pattern.
4. Inspect environment variable names.
5. Inspect form schemas and response contracts.
6. Align backend responses with frontend expectations.
7. Do not change backend architecture to match messy frontend code.
8. Prefer adding typed contracts and adapting frontend actions cleanly.
9. Update Swagger and docs after integration changes.

---

## 20. Comments Rules

All generated or modified code must include helpful comments when needed.

Rules:

1. Use bilingual Arabic + English comments for important functions, services, DTOs, guards, filters, and interceptors.
2. Do not comment obvious syntax.
3. Explain why a function exists, what it does, and any important business constraint.
4. Comments must be concise.
5. Every public service method should have a short bilingual comment.

Example:

```ts
// AR: يحجز دفعة مرحلة في وضع الديمو ويربطها بسجل الأحداث.
// EN: Reserves a milestone payment in demo mode and records the action in the timeline.
async fundMilestonePayment(dto: FundMilestonePaymentDto) {
  // Implementation
}
```

---

## 21. Build and Quality Rules

Before marking work complete, run when possible:

```bash
npm run build
npm run test
npx prisma format --schema prisma/schema
npx prisma generate --schema prisma/schema
```

Rules:

1. Do not ignore TypeScript errors.
2. Do not ignore Prisma validation errors.
3. Do not commit broken builds.
4. Do not leave placeholder imports that break compile.
5. If a package is missing, ask before adding it unless the task clearly requires it.
6. Update docs when behavior changes.

---

## 22. Phase Workflow Rules

Implementation must proceed in phases.

Phase 0:
Project infrastructure, Prisma multi-file schema, config, common types, CLS/request context, error translator, common exception filters, module shells.

Phase 1:
Auth, Users, Clients.

Phase 2:
Agreements, Policies, Milestones.

Phase 3:
Payments simulation, Deliveries, Timeline.

Phase 4:
Client Portal.

Phase 5:
AI Plan, AI Review, Change Requests.

Phase 6:
Email Notifications, Dashboard Analytics, Settings.

Phase 7:
Frontend Integration.

After completing each phase, stop and ask:

```txt
Phase X is complete. Do you want me to proceed to Phase X+1?
```

At Phase 7, stop and ask:

```txt
Is the frontend ready for integration?
```

Do not proceed without approval.

---

## 23. Golden Rule

Do not build blindly.

For every module:

1. Read these rules.
2. Check existing architecture.
3. Check Prisma schema files.
4. Check DTOs and Swagger.
5. Check error translation.
6. Check endpoint error docs.
7. Implement only the requested phase.
8. Run checks.
9. Stop and ask before continuing.
