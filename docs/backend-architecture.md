# Dhaman Backend Architecture

## Purpose

This Phase 0 architecture prepares a modular NestJS backend for the Dhaman MVP without locking the team into premature business logic. The focus is clear ownership boundaries, shared request context, consistent error handling, and a Prisma schema skeleton that supports incremental implementation.

## Core Principles

- Arabic-first UX support starts at the backend through locale-aware error translation.
- Modules are organized around business capabilities, not technical layers alone.
- Shared concerns live in `src/common` and remain framework-oriented rather than domain-heavy.
- External integrations stay behind module or infrastructure boundaries and remain stubbed in Phase 0.
- Success and error responses use a consistent envelope.
- Request context is propagated centrally so logs, errors, timelines, and audit entries can share the same request metadata.

## High-Level Structure

- `src/common`: cross-cutting foundations such as CLS, decorators, DTO envelopes, enums, filters, guards, interceptors, pipes, shared types, and utilities.
- `src/config`: typed configuration factories for application, JWT, storage, payment, email, AI, and database settings.
- `src/infrastructure/prisma`: Prisma service and module boundary.
- `src/modules`: business modules implemented as NestJS feature modules with controllers, services, and DTO folders.
- `prisma/schema.prisma`: MVP relational schema skeleton for PostgreSQL.
- `docs/`: implementation map, endpoint map, error policy, and phase plan.

## Request Lifecycle Foundations

1. Request enters Nest and passes through the request context middleware.
2. `requestId` and `correlationId` are extracted or generated.
3. Locale and actor context are initialized.
4. Controller and service layers can read request context through `ClsService`.
5. Interceptors log the request and wrap successful responses.
6. Exception filters translate known errors into the standard API error envelope.

## Phase 0 Deliverables

- Configuration scaffolding
- Prisma module shell
- Prisma schema skeleton
- Common enums mirrored in TypeScript
- CLS/request context foundation
- Error translator foundation
- Response envelope interceptor
- Request logging interceptor
- Exception filters
- Module shells for all MVP domains
- Documentation skeletons for implementation and testing

## Non-Goals in Phase 0

- Full domain validation logic
- Real authentication implementation
- Payment provider integration
- Gemini integration
- Resend integration
- File storage implementation
- Frontend integration
