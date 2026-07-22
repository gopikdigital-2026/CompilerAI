# Error Handling

## Error Hierarchy

All SDK errors extend `CompilerAIError`:

```
CompilerAIError (abstract)
├── AuthenticationError    (401, not retryable)
├── AuthorizationError     (403, not retryable)
├── ValidationError        (400, not retryable)
├── NotFoundError          (404, not retryable)
├── ConflictError          (409, not retryable)
├── RateLimitError         (429, retryable)
├── TimeoutError           (408, retryable)
├── NetworkError           (0,  retryable)
└── ServerError            (500+, retryable)
```

## Properties

Every `CompilerAIError` has:

| Property | Type | Description |
|----------|------|-------------|
| `code` | `string` | Machine-readable error code |
| `message` | `string` | Human-readable error message |
| `httpStatus` | `number` | HTTP status code (0 for network errors) |
| `retryable` | `boolean` | Whether the client should retry |
| `details` | `ApiErrorDetail[]` | Additional error details from the API |
| `meta` | `ApiMeta \| null` | Request metadata (requestId, correlationId) |
| `name` | `string` | Error class name |

## Usage

### Type Guard

```typescript
import { isCompilerAIError, NotFoundError } from '@compilerai/sdk-typescript';

try {
  await compiler.executions.get('missing');
} catch (e) {
  if (e instanceof NotFoundError) {
    console.log('Not found, handle gracefully');
  } else if (isCompilerAIError(e)) {
    console.log(`Error ${e.code}: ${e.message}`);
    console.log(`Request ID: ${e.meta?.requestId}`);
  } else {
    throw e; // re-throw non-SDK errors
  }
}
```

### Safe Serialization

```typescript
if (isCompilerAIError(e)) {
  const safe = e.toSafeObject();
  // safe has: code, message, httpStatus, retryable, details, requestId, correlationId
  // safe does NOT have: stack, apiKey, headers
  console.log(JSON.stringify(safe, null, 2));
}
```

### Retry Logic

The SDK automatically retries:
- `429 Too Many Requests` — after retry delay
- `500+ Server Errors` — after retry delay
- `NetworkError` (fetch failures) — after retry delay

Non-retryable errors (`400`, `401`, `403`, `404`, `409`) are thrown immediately.

You can disable retries per-request:

```typescript
await compiler.executions.get('exec_1', { retryable: false });
```

### Rate Limit Handling

```typescript
import { RateLimitError } from '@compilerai/sdk-typescript';

try {
  await compiler.executions.create({ ... });
} catch (e) {
  if (e instanceof RateLimitError) {
    const detail = e.details[0];
    if (detail?.resetAt) {
      const resetTime = new Date(detail.resetAt);
      console.log(`Rate limited. Reset at: ${resetTime}`);
    }
  }
}
```

## Error Code Mapping

| API Error Code | SDK Error Class | HTTP | Retryable |
|----------------|-----------------|------|-----------|
| `AUTHENTICATION_REQUIRED` | `AuthenticationError` | 401 | No |
| `ACCESS_DENIED` | `AuthorizationError` | 403 | No |
| `ORGANIZATION_MISMATCH` | `AuthorizationError` | 403 | No |
| `VALIDATION_ERROR` | `ValidationError` | 400 | No |
| `WORKFLOW_VALIDATION_FAILED` | `ValidationError` | 422 | No |
| `RESOURCE_NOT_FOUND` | `NotFoundError` | 404 | No |
| `EXECUTION_NOT_FOUND` | `NotFoundError` | 404 | No |
| `WORKFLOW_NOT_FOUND` | `NotFoundError` | 404 | No |
| `APPROVAL_NOT_FOUND` | `NotFoundError` | 404 | No |
| `INVALID_EXECUTION_STATE` | `ConflictError` | 409 | No |
| `INVALID_RESUME_TOKEN` | `ConflictError` | 409 | No |
| `IDEMPOTENCY_CONFLICT` | `ConflictError` | 409 | No |
| `RATE_LIMIT_EXCEEDED` | `RateLimitError` | 429 | Yes |
| `REQUEST_TIMEOUT` | `TimeoutError` | 408 | Yes |
| `RUNTIME_UNAVAILABLE` | `ServerError` | 503 | Yes |
| `INTERNAL_ERROR` | `ServerError` | 500 | Yes |
| (unknown) | `ServerError` | 500 | Yes |

## Security Guarantees

1. **API keys are never logged** — error messages never contain the API key
2. **Headers are sanitized** — `getSanitizedHeaders()` redacts `key`, `token`, `secret`, `password`, `authorization` headers
3. **No secrets in messages** — error messages come from the API response, not from SDK internals
4. **Stack traces excluded** — `toSafeObject()` omits the `stack` property
