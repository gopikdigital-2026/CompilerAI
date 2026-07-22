# Error Codes

## Overview

The API uses 16 error codes with consistent HTTP status mapping. Every error response includes:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [],
    "retryable": false
  },
  "meta": {
    "requestId": "...",
    "correlationId": "...",
    "timestamp": "...",
    "apiVersion": "v1"
  }
}
```

## Error Code Reference

| Code | HTTP | Retryable | Description |
|------|------|-----------|-------------|
| `VALIDATION_ERROR` | 400 | No | Request body or parameters failed validation |
| `AUTHENTICATION_REQUIRED` | 401 | No | Missing or invalid authentication credentials |
| `ACCESS_DENIED` | 403 | No | Authenticated but lacks required permission |
| `ORGANIZATION_MISMATCH` | 403 | No | Request organization does not match principal |
| `RESOURCE_NOT_FOUND` | 404 | No | Generic resource not found (unknown route) |
| `EXECUTION_NOT_FOUND` | 404 | No | Execution ID does not exist or belongs to another org |
| `WORKFLOW_NOT_FOUND` | 404 | No | Workflow ID does not exist or belongs to another org |
| `APPROVAL_NOT_FOUND` | 404 | No | Approval ID does not exist or belongs to another org |
| `INVALID_EXECUTION_STATE` | 409 | No | Invalid state transition (e.g. cancel a completed execution) |
| `INVALID_RESUME_TOKEN` | 409 | No | Resume token is expired, consumed, or invalid |
| `IDEMPOTENCY_CONFLICT` | 409 | No | Same idempotency key with different request body |
| `WORKFLOW_VALIDATION_FAILED` | 422 | No | Workflow definition has structural errors |
| `RATE_LIMIT_EXCEEDED` | 429 | Yes | Rate limit exceeded — retry after window resets |
| `REQUEST_TIMEOUT` | 408 | Yes | Request exceeded the maximum duration |
| `RUNTIME_UNAVAILABLE` | 503 | Yes | Runtime is temporarily unavailable |
| `INTERNAL_ERROR` | 500 | No | Unexpected internal error |

## Retry Behavior

Clients should retry requests when `retryable: true`. Use exponential backoff with jitter. The `details` array may contain a `retry-after` hint for rate-limited responses.

## Correlation IDs

Every response (success and error) includes a `meta.correlationId`. If the client provides `X-Correlation-Id` header, it is echoed back. Otherwise, a new correlation ID is generated. This enables distributed tracing across the platform.
