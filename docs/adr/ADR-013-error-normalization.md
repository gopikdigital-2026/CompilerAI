# ADR-013: Error Normalization

## Context
Four incompatible error hierarchies exist: RuntimeError, InfrastructureError, ApiErrorCode (string union), and ad-hoc `Object.assign(new Error(), {code})`. No shared base, no consistent `retryable` flag, no safe serialization.

## Decision
Define `DomainError` abstract base in `shared/contracts/DomainError.ts` with:
- `code: string` — machine-readable error code
- `category: ErrorCategory` — VALIDATION, AUTHENTICATION, AUTHORIZATION, NOT_FOUND, CONFLICT, DOMAIN_RULE, TIMEOUT, CANCELLATION, INFRASTRUCTURE
- `retryable: boolean` — whether the client should retry
- `severity: ErrorSeverity` — LOW, MEDIUM, HIGH, CRITICAL
- `correlationId?`, `entityId?`, `metadata`, `cause?`
- `toSafe()` — serializes without stack traces or sensitive data

## Alternatives
- **Keep 4 hierarchies**: Rejected — inconsistent, unsafe serialization
- **Use a single Error subclass with optional fields**: Rejected — loses type safety

## Consequences
- `toSafeError()` utility for unknown error types
- `isRetryableError()` helper for retry logic
- `isDomainError()` type guard
- Existing errors migrate gradually (RuntimeError → extends DomainError)
- API layer maps `DomainError.category` → HTTP status
