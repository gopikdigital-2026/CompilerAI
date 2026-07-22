# Idempotency

## Overview

POST endpoints support idempotency to safely retry requests without side effects. The idempotency key is provided in the request body (`idempotencyKey` field) and/or the `Idempotency-Key` header.

## How It Works

1. **First request** with a given key: The request is processed normally. The response (status + body) is cached with the request hash.
2. **Retry with same key + same body**: The cached response is returned immediately. No side effects.
3. **Retry with same key + different body**: Returns `409 IDEMPOTENCY_CONFLICT`. The client must use a new key for a different request.

## Request Hashing

The request body is serialized to JSON and hashed using the djb2 algorithm. The hash is prefixed with `reqhash:`. This deterministic hash ensures identical requests produce the same hash.

## TTL

Cached idempotency records expire after 24 hours (86,400,000 ms). After expiry, the same key can be reused.

## Examples

### Successful Retry

```bash
# First request
curl -X POST /api/v1/executions \
  -H "X-API-Key: key-admin" \
  -d '{"workflowId":"wf-1","input":{},"idempotencyKey":"idem-001"}'
# → 202 Accepted, executionId: exec-001

# Retry with same key + same body
curl -X POST /api/v1/executions \
  -H "X-API-Key: key-admin" \
  -d '{"workflowId":"wf-1","input":{},"idempotencyKey":"idem-001"}'
# → 202 Accepted, executionId: exec-001 (cached, no new execution created)
```

### Conflict

```bash
# First request
curl -X POST /api/v1/executions \
  -H "X-API-Key: key-admin" \
  -d '{"workflowId":"wf-1","input":{"prompt":"A"},"idempotencyKey":"idem-002"}'
# → 202 Accepted

# Different body, same key
curl -X POST /api/v1/executions \
  -H "X-API-Key: key-admin" \
  -d '{"workflowId":"wf-1","input":{"prompt":"B"},"idempotencyKey":"idem-002"}'
# → 409 Conflict
```

## Tenant Isolation

Idempotency records are scoped by `organizationId`. The same idempotency key used by different organizations does not conflict.

## Error Response

```json
{
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "Idempotency key conflict: same key with different request body",
    "details": [],
    "retryable": false
  },
  "meta": { ... }
}
```
