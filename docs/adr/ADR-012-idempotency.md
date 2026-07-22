# ADR-012: Idempotency

## Context
Duplicate API requests (network retries, client bugs) must not cause duplicate executions or side effects.

## Decision
Implement idempotency at two layers:
1. **API layer**: `IdempotencyService` + `InMemoryIdempotencyRepository` — caches responses by `Idempotency-Key` header
2. **Runtime layer**: `RuntimeRequest.idempotencyKey` — `RuntimeCoordinator` checks for existing execution with same key, throws `IdempotencyDuplicateError` if found

## Alternatives
- **No idempotency**: Rejected — duplicate executions, double side effects
- **Distributed lock only**: Rejected — doesn't return cached result

## Consequences
- Duplicate requests are rejected (runtime) or cached (API)
- `IdempotencyDuplicateError` on duplicate runtime keys
- `computeIdempotencyKey()` utility for generating keys from request content
- Idempotency keys have TTL (configurable via repository)
