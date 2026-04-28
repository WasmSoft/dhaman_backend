# Dhaman API Map

## Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

## Users

- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`

## Clients

- `GET /api/v1/clients`
- `POST /api/v1/clients`
- `GET /api/v1/clients/:id`
- `PATCH /api/v1/clients/:id`

## Agreements

- `GET /api/v1/agreements`
- `POST /api/v1/agreements`
- `GET /api/v1/agreements/:id`
- `PATCH /api/v1/agreements/:id`
- `POST /api/v1/agreements/:id/send-invite`
- `POST /api/v1/agreements/:id/approve`
- `POST /api/v1/agreements/:id/request-change`

## Agreement Policies

- `GET /api/v1/agreements/:agreementId/policies`
- `PATCH /api/v1/agreements/:agreementId/policies`

## Milestones

- `GET /api/v1/agreements/:agreementId/milestones`
- `POST /api/v1/agreements/:agreementId/milestones`
- `PATCH /api/v1/milestones/:id`
- `PATCH /api/v1/milestones/:id/status`

## Payments

- `GET /api/v1/agreements/:agreementId/payments`
- `POST /api/v1/payments/fund-milestone`
- `POST /api/v1/payments/release`
- `GET /api/v1/payments/:id`
- `GET /api/v1/payments/:id/receipt`

## Deliveries

- `POST /api/v1/milestones/:milestoneId/deliveries`
- `GET /api/v1/deliveries`
- `GET /api/v1/deliveries/:id`
- `POST /api/v1/deliveries/:id/request-change`
- `POST /api/v1/deliveries/:id/accept`

## Client Portal

- `GET /api/v1/portal/:token`
- `POST /api/v1/portal/:token/approve`
- `POST /api/v1/portal/:token/request-changes`
- `GET /api/v1/portal/:token/payments`
- `GET /api/v1/portal/:token/deliveries/:deliveryId`

## AI Plan

- `POST /api/v1/ai-plan/generate`

## AI Review

- `POST /api/v1/ai-review`
- `GET /api/v1/ai-review`
- `GET /api/v1/ai-review/:id`
- `POST /api/v1/ai-review/:id/accept-recommendation`

## Change Requests

- `GET /api/v1/change-requests`
- `POST /api/v1/change-requests`
- `GET /api/v1/change-requests/:id`
- `POST /api/v1/change-requests/:id/approve`
- `POST /api/v1/change-requests/:id/decline`
- `POST /api/v1/change-requests/:id/pay`

## Timeline Events

- `GET /api/v1/agreements/:agreementId/timeline`

## Email Notifications

- `POST /api/v1/email-notifications/preview`
- `POST /api/v1/email-notifications/send-test`

## Dashboard Analytics

- `GET /api/v1/dashboard/overview`

## Settings

- `GET /api/v1/settings`
- `PATCH /api/v1/settings`
