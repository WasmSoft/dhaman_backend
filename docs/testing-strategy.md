# Dhaman Testing Strategy

## Testing Layers

- Unit tests for DTO validation, service rules, utility functions, and error translation.
- Integration tests for controllers, guards, interceptors, filters, and Prisma-backed repositories.
- End-to-end tests for major MVP flows after business logic is implemented.

## Phase 0 Expectations

- Ensure the application boots with global middleware, interceptors, and filters.
- Validate request context propagation for request ID, correlation ID, locale, and actor type.
- Validate success response envelopes.
- Validate error response envelopes and localized translation fallbacks.
- Validate Prisma exception mapping behavior with mocked Prisma-like errors.

## Recommended Test Focus by Phase

- Phase 1: auth flows, user self-service, client ownership boundaries
- Phase 2: agreement creation/update rules, policy validation, milestone ordering and totals
- Phase 3: payment demo flow, delivery transitions, timeline side effects
- Phase 4: portal token verification and portal scope restrictions
- Phase 5: AI plan/review orchestration and change request transitions
- Phase 6: notification dispatching, settings persistence, dashboard aggregation correctness

## Tooling Notes

- Keep unit tests close to modules when business logic starts growing.
- Use fixtures/builders for agreement and milestone payloads.
- Mock external integrations at module boundaries.
- Prefer deterministic timestamps and request IDs in error-handling tests.
