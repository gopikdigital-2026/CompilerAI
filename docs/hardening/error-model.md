# Error Model

## Current State: Four Incompatible Error Hierarchies

| Hierarchy | Base class | `code` | `retryable` | `httpStatus` | Location |
|-----------|-----------|--------|-------------|--------------|----------|
| RuntimeError | `Error` | ✗ | ✗ | ✗ | `compiler/runtime/errors/RuntimeErrors.ts` |
| InfrastructureError | `Error` | ✓ | ✓ | ✗ | `infrastructure/errors/InfrastructureErrors.ts` |
| ApiErrorCode | (string union) | ✓ | ✓ | ✓ | `platform/api/errors/ApiErrorCodes.ts` |
| Ad-hoc Object.assign | `Error` | ✓ | ✗ | ✓ | `platform/api/services/ApplicationServices.ts` |

## Canonical Error Classification

| Category | Description | Retryable | HTTP Status |
|----------|-------------|-----------|-------------|
| VALIDATION | Input validation failed | No | 400 |
| AUTHENTICATION | Auth credentials missing or invalid | No | 401 |
| AUTHORIZATION | Insufficient permissions | No | 403 |
| NOT_FOUND | Resource not found | No | 404 |
| CONFLICT | State conflict (duplicate, version mismatch) | No | 409 |
| DOMAIN_RULE | Business rule violation | No | 422 |
| TIMEOUT | Operation exceeded time limit | Yes | 504 |
| CANCELLATION | Operation was cancelled | No | 499 |
| INFRASTRUCTURE | Backend/DB/network failure | Yes | 503 |

## Canonical DomainError (src/shared/contracts/DomainError.ts)

```typescript
abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly category: ErrorCategory;
  abstract readonly retryable: boolean;
  readonly severity: ErrorSeverity;    // LOW | MEDIUM | HIGH | CRITICAL
  readonly correlationId?: string;
  readonly entityId?: string;
  readonly metadata: Metadata;
  readonly cause?: Error;

  toSafe(): Record<string, unknown>  // excludes stack trace, sensitive data
}
```

## Error Categories Mapped to Existing Errors

### VALIDATION
- `RuntimeValidationError` — Runtime request validation failed
- `WorkflowValidationError` — Workflow definition invalid
- `LearningValidationError` — Learning input invalid
- `MemoryValidationError` — Memory entry invalid
- `InvalidPlanError` — Execution plan invalid
- `InvalidDecisionInputError` — Decision input invalid
- `InvalidOrchestratorInputError` — Orchestrator input invalid
- `InvalidTelemetryEventError` — Telemetry event invalid

### AUTHENTICATION
- `AuthenticationError` — Auth failed (identity)
- `InvalidCredentialsError` — Wrong email/password
- `TokenExpiredError` — JWT expired
- `TokenInvalidError` — JWT invalid
- `ApiKeyInvalidError` — API key invalid
- `ApiKeyRevokedError` — API key revoked
- `ApiKeyExpiredError` — API key expired
- `AccountLockedError` — Account locked (brute-force)
- `SessionExpiredError` — Session expired

### AUTHORIZATION
- `AuthorizationError` — Insufficient permissions
- `InsufficientPermissionsError` — Missing required permission
- `WrongOrganizationError` — Cross-org access denied
- `PrivilegeEscalationError` — Privilege escalation attempt
- `ToolPermissionDeniedError` — Tool not permitted
- `ExecutionPermissionError` — Execution not permitted

### NOT_FOUND
- `MemoryNotFoundError` — Memory entry not found
- `ToolNotFoundError` — Tool not found

### CONFLICT
- `IdempotencyDuplicateError` — Duplicate idempotency key
- `IdempotencyViolationError` — Idempotency violation
- `ResumeTokenConsumedError` — Resume token already used
- `DuplicateMemoryError` — Duplicate memory entry
- `RecommendationAlreadyProcessedError` — Recommendation already handled

### DOMAIN_RULE
- `ApprovalRejectedError` — Approval was rejected
- `ApprovalExpiredError` — Approval timed out
- `TenantIsolationError` — Tenant isolation violated
- `PlanningBlockedError` — Planning blocked by constraints
- `DecisionBlockedError` — Decision blocked
- `NoViableAlternativeError` — No viable alternative found
- `RecommendationNotApprovedError` — Recommendation not approved
- `PatternRegressionError` — Pattern marked as regression
- `PlanNotApprovedError` — Plan not approved for execution
- `SensitiveDataBlockedError` — Sensitive data blocked by policy
- `AccountSuspendedError` — Account suspended
- `AccountDisabledError` — Account disabled
- `OrganizationSuspendedError` — Organization suspended
- `InvitationExpiredError` — Invitation expired
- `InvitationRevokedError` — Invitation revoked

### TIMEOUT
- `RuntimeTimeoutError` — Runtime exceeded duration
- `ExecutionTimeoutError` — Execution step timed out

### CANCELLATION
- `ExecutionCancelledError` — Execution cancelled

### INFRASTRUCTURE
- `InfrastructureError` subclasses — DB, cache, queue failures
- `TraceRepositoryError` — Trace repository failure
- `CheckpointIncompatibleError` — Checkpoint incompatible with current state
- `ResumeTokenExpiredError` — Resume token expired
- `CompensationError` — Compensation failed
- `ToolRegistryError` — Tool registry error
- `NoEligibleToolsError` — No eligible tools found

## Safe Error Responses

### API Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed: organizationId is required.",
    "category": "VALIDATION",
    "retryable": false,
    "correlationId": "corr_abc123"
  }
}
```

### Rules

1. **Never expose stack traces** in API responses
2. **Never expose internal paths** or file names
3. **Never expose sensitive data** (passwords, tokens, API keys, user PII)
4. **Include correlationId** when available, for debugging
5. **Include retryable flag** so clients know whether to retry
6. **Use `toSafe()`** on DomainError instances to get a sanitized object
7. **Map to HTTP status** using the category → status table above

## Migration Strategy

1. **Phase 1 (complete)**: `DomainError` base class in `shared/contracts/`
2. **Phase 2 (future)**: RuntimeError extends DomainError, add `code`/`retryable`
3. **Phase 3 (future)**: InfrastructureError extends DomainError
4. **Phase 4 (future)**: ApplicationServices ad-hoc errors replaced with DomainError subclasses
5. **Phase 5 (future)**: ApiErrorCode lookup table maps DomainError.code → HTTP status
