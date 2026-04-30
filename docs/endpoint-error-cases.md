# Endpoint Error Cases

The tables below define implementation-time expectations for success behavior, common errors, side effects, and tests. They are placeholders in Phase 0 and should be expanded while implementing each module.

## Auth

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `POST /api/v1/auth/register` | Creates freelancer account | `VALIDATION_ERROR`, `AUTH_EMAIL_ALREADY_EXISTS` | May create audit log | valid payload, duplicate email, invalid email |
| `POST /api/v1/auth/login` | Returns auth session payload | `VALIDATION_ERROR`, `AUTH_INVALID_CREDENTIALS`, `AUTH_USER_NOT_FOUND` | May create audit log | valid login, wrong password, unknown email |
| `GET /api/v1/auth/me` | Returns authenticated user | `UNAUTHORIZED`, `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED` | none | authenticated request, missing token |

## Users

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `GET /api/v1/users/me` | Returns current user profile | `UNAUTHORIZED`, `AUTH_USER_NOT_FOUND` | none | authenticated fetch, missing auth |
| `PATCH /api/v1/users/me` | Updates user profile | `UNAUTHORIZED`, `VALIDATION_ERROR`, `AUTH_USER_NOT_FOUND` | May create audit log | valid patch, invalid payload |

## Clients

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `GET /api/v1/clients` | Lists freelancer clients | `UNAUTHORIZED` | none | returns owned clients only |
| `POST /api/v1/clients` | Creates client record | `UNAUTHORIZED`, `VALIDATION_ERROR`, `CLIENT_EMAIL_ALREADY_EXISTS` | Timeline or audit entry may be added later | valid create, duplicate email |
| `GET /api/v1/clients/:id` | Returns client details | `UNAUTHORIZED`, `CLIENT_NOT_FOUND` | none | owned client fetch, missing client |
| `PATCH /api/v1/clients/:id` | Updates client record | `UNAUTHORIZED`, `VALIDATION_ERROR`, `CLIENT_NOT_FOUND` | Audit entry may be added later | valid patch, unknown client |

## Agreements

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `GET /api/v1/agreements` | Lists agreements | `UNAUTHORIZED` | none | returns agreements for freelancer |
| `POST /api/v1/agreements` | Creates draft agreement | `UNAUTHORIZED`, `VALIDATION_ERROR`, `CLIENT_NOT_FOUND`, `AGREEMENT_CLIENT_REQUIRED`, `PAYMENT_INVALID_AMOUNT` | Creates timeline event `AGREEMENT_CREATED` | valid create, missing title, invalid amount |
| `GET /api/v1/agreements/:id` | Returns agreement details | `UNAUTHORIZED`, `AGREEMENT_NOT_FOUND` | none | owned agreement fetch |
| `PATCH /api/v1/agreements/:id` | Updates draft agreement | `UNAUTHORIZED`, `VALIDATION_ERROR`, `AGREEMENT_NOT_FOUND`, `AGREEMENT_CANNOT_BE_MODIFIED` | May append timeline event | draft only update |
| `POST /api/v1/agreements/:id/send-invite` | Sends invite to client | `UNAUTHORIZED`, `AGREEMENT_NOT_FOUND`, `AGREEMENT_ALREADY_SENT`, `AGREEMENT_POLICY_REQUIRED` | Creates timeline event, triggers email notification | sent once only |
| `POST /api/v1/agreements/:id/approve` | Approves agreement | `UNAUTHORIZED`, `AGREEMENT_NOT_FOUND`, `AGREEMENT_ALREADY_APPROVED` | Creates timeline event, may transition payment flow | valid approval, duplicate approval |
| `POST /api/v1/agreements/:id/request-change` | Creates agreement change request intent | `UNAUTHORIZED`, `AGREEMENT_NOT_FOUND`, `AGREEMENT_CANNOT_BE_MODIFIED` | Creates timeline entry, may notify parties | valid change request |

## Agreement Policies

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `GET /api/v1/agreements/:agreementId/policies` | Returns agreement policies | `UNAUTHORIZED`, `AGREEMENT_NOT_FOUND`, `POLICY_NOT_FOUND` | none | policy fetch |
| `PATCH /api/v1/agreements/:agreementId/policies` | Updates policy rules | `UNAUTHORIZED`, `VALIDATION_ERROR`, `AGREEMENT_NOT_FOUND`, `POLICY_INVALID_REVIEW_PERIOD`, `POLICY_INVALID_CONTENT` | May create timeline event | invalid review period, valid update |

## Milestones

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `GET /api/v1/agreements/:agreementId/milestones` | Lists owned agreement milestones with totals | `UNAUTHORIZED`, `AGREEMENT_NOT_FOUND` | none | owned list, wrong owner |
| `POST /api/v1/agreements/:agreementId/milestones` | Creates milestone | `UNAUTHORIZED`, `VALIDATION_ERROR`, `AGREEMENT_NOT_FOUND`, `AGREEMENT_CANNOT_BE_MODIFIED`, `MILESTONE_INVALID_AMOUNT`, `MILESTONE_INVALID_ORDER` | Creates waiting demo payment; emits `MILESTONE_CREATED` timeline event | valid create, invalid amount, duplicate order, timeline event |
| `PATCH /api/v1/milestones/:id` | Updates milestone | `UNAUTHORIZED`, `VALIDATION_ERROR`, `MILESTONE_NOT_FOUND`, `AGREEMENT_CANNOT_BE_MODIFIED`, `MILESTONE_INVALID_AMOUNT`, `PAYMENT_NOT_FOUND` | Syncs linked payment amount when changed; emits `MILESTONE_UPDATED` timeline event when fields change | valid patch, active agreement blocked, timeline event |
| `DELETE /api/v1/milestones/:id` | Deletes milestone | `UNAUTHORIZED`, `MILESTONE_NOT_FOUND`, `AGREEMENT_CANNOT_BE_MODIFIED`, `PAYMENT_NOT_FOUND`, `MILESTONE_PAYMENT_NOT_WAITING` | Deletes linked waiting payment; emits `MILESTONE_DELETED` timeline event | valid delete, funded payment blocked, timeline event |
| `PATCH /api/v1/milestones/:id/reorder` | Reorders all milestones in the agreement | `UNAUTHORIZED`, `VALIDATION_ERROR`, `MILESTONE_NOT_FOUND`, `AGREEMENT_CANNOT_BE_MODIFIED`, `MILESTONE_INVALID_ORDER` | Updates milestone order fields transactionally; emits `MILESTONES_REORDERED` timeline event with ordered milestone IDs | valid reorder, duplicate order, missing milestone, active agreement blocked, timeline event |
| `GET /api/v1/milestones/:id` | Returns one owned milestone | `UNAUTHORIZED`, `MILESTONE_NOT_FOUND` | none | owned fetch, wrong owner |

## Payments

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `GET /api/v1/agreements/:agreementId/payments` | Lists agreement payments | `UNAUTHORIZED`, `AGREEMENT_NOT_FOUND` | none | list by agreement |
| `POST /api/v1/payments/fund-milestone` | Reserves demo payment | `UNAUTHORIZED`, `VALIDATION_ERROR`, `PAYMENT_INVALID_AMOUNT`, `PAYMENT_ALREADY_RESERVED`, `PAYMENT_DEMO_MODE_ONLY`, `MILESTONE_NOT_FOUND` | Changes payment status, creates timeline event | valid fund, duplicate reserve |
| `POST /api/v1/payments/release` | Releases payment | `UNAUTHORIZED`, `VALIDATION_ERROR`, `PAYMENT_NOT_FOUND`, `PAYMENT_ALREADY_RELEASED`, `PAYMENT_NOT_READY_TO_RELEASE` | Changes payment status, creates timeline event, may send email | valid release, invalid state |
| `GET /api/v1/payments/:id` | Returns payment details | `UNAUTHORIZED`, `PAYMENT_NOT_FOUND` | none | fetch existing payment |
| `GET /api/v1/payments/:id/receipt` | Returns demo receipt payload | `UNAUTHORIZED`, `PAYMENT_NOT_FOUND` | none | receipt fetch |

## Deliveries

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `POST /api/v1/milestones/:milestoneId/deliveries` | Submits milestone delivery | `UNAUTHORIZED`, `VALIDATION_ERROR`, `MILESTONE_NOT_FOUND`, `DELIVERY_URL_OR_FILE_REQUIRED`, `DELIVERY_ALREADY_SUBMITTED` | Creates timeline event, may notify client | valid URL submission, file-only submission |
| `GET /api/v1/deliveries` | Lists deliveries | `UNAUTHORIZED` | none | list relevant deliveries |
| `GET /api/v1/deliveries/:id` | Returns delivery details | `UNAUTHORIZED`, `DELIVERY_NOT_FOUND` | none | fetch delivery |
| `POST /api/v1/deliveries/:id/request-change` | Requests changes on delivery | `UNAUTHORIZED`, `DELIVERY_NOT_FOUND`, `DELIVERY_ALREADY_ACCEPTED` | Creates timeline event, may create change request | valid request change |
| `POST /api/v1/deliveries/:id/accept` | Accepts delivery | `UNAUTHORIZED`, `DELIVERY_NOT_FOUND`, `DELIVERY_NOT_IN_REVIEW` | Changes payment readiness, creates timeline event | valid acceptance, invalid review state |

## Client Portal

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `GET /api/v1/portal/:token/invite` | Returns agreement invite summary | `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED`, `AGREEMENT_NOT_FOUND` | none | valid token, expired token, agreement not found |
| `POST /api/v1/portal/:token/approve` | Approves agreement | `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED`, `AGREEMENT_NOT_APPROVABLE` | Timeline event `AGREEMENT_APPROVED`, email notification | valid approve, invalid state |
| `POST /api/v1/portal/:token/request-changes` | Requests agreement changes | `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED`, `VALIDATION_ERROR`, `AGREEMENT_NOT_CHANGEABLE` | Timeline event `AGREEMENT_CHANGES_REQUESTED`, email notification | valid change request, invalid state |
| `POST /api/v1/portal/:token/reject` | Rejects agreement invitation | `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED`, `VALIDATION_ERROR`, `AGREEMENT_NOT_REJECTABLE` | Timeline event `AGREEMENT_REJECTED`, email notification | valid reject, invalid state |
| `GET /api/v1/portal/:token` | Returns full portal workspace | `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED`, `AGREEMENT_NOT_FOUND` | none | valid token, empty sub-resources |
| `GET /api/v1/portal/:token/deliveries/:deliveryId` | Returns portal delivery detail | `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED`, `DELIVERY_NOT_FOUND` | none | valid delivery fetch, cross-agreement masking |
| `POST /api/v1/portal/:token/deliveries/:deliveryId/accept` | Accepts delivery | `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED`, `DELIVERY_NOT_FOUND`, `DELIVERY_NOT_REVIEWABLE` | Delegates to deliveries module | valid accept, cross-agreement masking |
| `POST /api/v1/portal/:token/deliveries/:deliveryId/request-changes` | Requests delivery changes | `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED`, `VALIDATION_ERROR`, `DELIVERY_NOT_FOUND`, `DELIVERY_NOT_REVIEWABLE` | Delegates to deliveries module | valid change request, cross-agreement masking |
| `GET /api/v1/portal/:token/payments` | Returns portal payment plan | `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED` | none | valid token fetch |
| `POST /api/v1/portal/:token/payments/:id/fund` | Demo-funds a payment | `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED`, `VALIDATION_ERROR`, `PAYMENT_NOT_FOUND`, `PAYMENT_NOT_FUNDABLE` | Delegates to payments module | valid fund, cross-agreement masking |
| `POST /api/v1/portal/:token/payments/:id/release` | Client confirms payment release | `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED`, `VALIDATION_ERROR`, `PAYMENT_NOT_FOUND`, `PAYMENT_NOT_READY_TO_RELEASE` | Delegates to payments module | valid release, cross-agreement masking |
| `GET /api/v1/portal/:token/payment-history` | Returns demo payment history | `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED` | none | valid token fetch |
| `GET /api/v1/portal/:token/timeline` | Returns client-safe timeline | `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED` | none | valid token fetch, client-safe fields |

## AI Plan

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `POST /api/v1/ai-plan/generate` | Returns generated milestone/payment draft | `UNAUTHORIZED`, `VALIDATION_ERROR`, `AI_PLAN_GENERATION_FAILED`, `AI_INVALID_RESPONSE` | Calls AI provider later | valid prompt, provider failure |

## AI Review

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `POST /api/v1/ai-review` | Creates AI review job | `UNAUTHORIZED`, `VALIDATION_ERROR`, `AI_REVIEW_FAILED`, `DELIVERY_NOT_FOUND` | Calls AI provider later, creates timeline event | valid review request |
| `GET /api/v1/ai-review` | Lists reviews | `UNAUTHORIZED` | none | list by freelancer |
| `GET /api/v1/ai-review/:id` | Returns review details | `UNAUTHORIZED`, `AI_REVIEW_NOT_FOUND` | none | fetch review |
| `POST /api/v1/ai-review/:id/accept-recommendation` | Accepts recommendation | `UNAUTHORIZED`, `AI_REVIEW_NOT_FOUND`, `AI_REVIEW_ALREADY_COMPLETED` | May change milestone, delivery, payment, timeline states | accept once only |

## Change Requests

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `GET /api/v1/change-requests` | Lists change requests | `UNAUTHORIZED` | none | list requests |
| `POST /api/v1/change-requests` | Creates change request | `UNAUTHORIZED`, `VALIDATION_ERROR`, `CHANGE_REQUEST_INVALID_SCOPE`, `PAYMENT_INVALID_AMOUNT` | Timeline event, payment placeholder may be created | valid create |
| `GET /api/v1/change-requests/:id` | Returns change request details | `UNAUTHORIZED`, `CHANGE_REQUEST_NOT_FOUND` | none | fetch request |
| `POST /api/v1/change-requests/:id/approve` | Approves change request | `UNAUTHORIZED`, `CHANGE_REQUEST_NOT_FOUND`, `CHANGE_REQUEST_ALREADY_APPROVED` | Timeline event, may require payment | approve once only |
| `POST /api/v1/change-requests/:id/decline` | Declines change request | `UNAUTHORIZED`, `CHANGE_REQUEST_NOT_FOUND`, `CHANGE_REQUEST_ALREADY_DECLINED` | Timeline event | decline once only |
| `POST /api/v1/change-requests/:id/pay` | Pays approved change request | `UNAUTHORIZED`, `CHANGE_REQUEST_NOT_FOUND`, `CHANGE_REQUEST_PAYMENT_REQUIRED`, `PAYMENT_DEMO_MODE_ONLY` | Changes payment state, creates timeline event | valid payment |

## Timeline Events

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `GET /api/v1/agreements/:agreementId/timeline` | Returns paginated agreement timeline for authenticated freelancer | `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `AGREEMENT_NOT_FOUND`, `TIMELINE_EVENT_TYPE_INVALID` | none | owned agreement timeline fetch, invalid query filters, reversed date range, missing auth, wrong owner |
| `GET /api/v1/portal/:token/timeline` | Returns client-safe paginated portal timeline | `VALIDATION_ERROR`, `PORTAL_TOKEN_INVALID`, `PORTAL_TOKEN_EXPIRED`, `PORTAL_TOKEN_REVOKED`, `TIMELINE_EVENT_TYPE_INVALID` | none | valid portal token fetch, invalid token, expired token, revoked token, filtered metadata |
| _(internal)_ `TimelineEventsService.createEvent` | Creates append-only timeline event with CLS traceability | `TIMELINE_EVENT_TYPE_INVALID`, `TIMELINE_METADATA_INVALID` | Creates timeline record with safe metadata | valid creation, invalid event type, forbidden metadata keys (nested, mixed-case, array), CLS requestId/correlationId persistence |

### Phase 5 Verified Behaviors

- **Event creation safety**: Unapproved event types rejected; metadata with forbidden keys (password, secret, token, credential, etc.) rejected recursively with case-insensitive matching.
- **Append-only**: Timeline reads never invoke create/update/delete operations.
- **CLS traceability**: `requestId` and `correlationId` stored in event metadata when present in request context; empty values discarded.
- **Dashboard ownership**: Freelancer-verified agreement scope enforced; missing auth and non-owned agreements produce stable errors.
- **Portal scoping**: Token-based agreement scope enforced; invalid, revoked, and expired tokens produce distinct error codes.
- **Portal-safe metadata**: Client-facing responses recursively filter forbidden keys from top-level, nested, and array-of-object metadata values.
- **Reversed date range**: `from > to` queries produce `VALIDATION_ERROR` rather than silent empty results.

## Email Notifications

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `POST /api/v1/email-notifications/preview` | Returns preview payload | `UNAUTHORIZED`, `VALIDATION_ERROR`, `EMAIL_TEMPLATE_NOT_FOUND` | none | preview template |
| `POST /api/v1/email-notifications/send-test` | Sends or simulates test email | `UNAUTHORIZED`, `VALIDATION_ERROR`, `EMAIL_RECIPIENT_REQUIRED`, `EMAIL_SEND_FAILED` | Creates email notification log | valid send, missing recipient |

## Dashboard Analytics

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `GET /api/v1/dashboard/overview` | Returns overview metrics | `UNAUTHORIZED` | none | authenticated fetch |

## Settings

| Endpoint | Success | Possible Errors | Side Effects | Testing Cases |
| --- | --- | --- | --- | --- |
| `GET /api/v1/settings` | Returns user settings | `UNAUTHORIZED`, `SETTINGS_NOT_FOUND` | none | fetch existing settings |
| `PATCH /api/v1/settings` | Updates user settings | `UNAUTHORIZED`, `VALIDATION_ERROR`, `SETTINGS_INVALID_VALUE` | May create audit log | valid patch, invalid value |
