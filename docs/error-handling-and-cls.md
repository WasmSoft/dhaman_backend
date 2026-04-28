# Error Handling and CLS

## Request Context

Each request initializes a context object with:

- `requestId`
- `correlationId`
- `userId`
- `userRole`
- `actorType`
- `portalTokenId`
- `agreementId`
- `locale`
- `startedAt`

The context is stored through an internal `AsyncLocalStorage`-based abstraction in `ClsService`. Middleware is responsible for extracting headers, generating identifiers, and attaching the initialized context to both the request object and the async context store.

## Header Rules

- Reuse `x-request-id` when provided.
- Reuse `x-correlation-id` when provided.
- If `x-correlation-id` is missing, reuse the `requestId`.
- Echo both identifiers back in the response headers.

## Error Envelope

All API errors must resolve to:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Internal server error",
    "localizedMessage": "حدث خطأ داخلي في الخادم",
    "details": {},
    "fieldErrors": [],
    "requestId": "req_xxx",
    "timestamp": "2026-04-28T00:00:00.000Z",
    "path": "/api/v1/example",
    "method": "GET"
  }
}
```

## Translation Flow

1. Controllers and services throw `AppException` with a stable `ErrorCode`.
2. Filters translate the code using the request locale.
3. English text is the default fallback.
4. Unknown codes fall back to `INTERNAL_SERVER_ERROR`.

## Prisma Error Policy

- `P2002` -> `CONFLICT`
- `P2025` -> `NOT_FOUND`
- Other Prisma-like errors -> `INTERNAL_SERVER_ERROR`

Raw database details must stay out of the client response. Internal logs should include `requestId`.
