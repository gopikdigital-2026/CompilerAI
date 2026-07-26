# API Reference — CompilerAI Platform API v1

The CompilerAI Platform API is a framework-agnostic REST API that exposes the platform's execution, workflow, approval, telemetry, memory, and tool management capabilities. It lives at `/api/v1` and follows the OpenAPI 3.1 specification.

---

## Platform API Overview

### Architecture

```
HTTP Adapter (transport)
    ↓
Route Registry (pattern matching with :param syntax)
    ↓
Middleware Pipeline (auth → rate limit → idempotency)
    ↓
Controllers (request handling, DTO mapping)
    ↓
Application Services (orchestration, tenant scoping)
    ↓
Compiler Runtime (domain logic)
```

### Key design points

- **Framework-agnostic:** The domain layer has zero coupling to any HTTP framework. `IHttpAdapter` is pluggable — `InMemoryHttpAdapter` is used for testing and development; Express/Fastify/Hono adapters can be built without touching domain code.
- **DTO separation:** Domain models (`RuntimeExecution`, `WorkflowDefinition`, `ApprovalRequest`) are never exposed directly. All responses use dedicated DTOs (`ExecutionResponseDto`, `WorkflowResponseDto`, `ApprovalResponseDto`).
- **OpenAPI 3.1:** The full specification is at `src/platform/api/openapi/compiler-platform-api-v1.yaml` and served at `GET /api/v1/openapi`.

### Controllers

6 controllers with 25+ handlers: `ExecutionController`, `WorkflowController`, `ApprovalController`, `TelemetryController`, `CapabilityController`, `HealthController`.

---

## Authentication

Two authentication methods are supported. API keys are checked first; if a `Bearer` token is present, the JWT validator is used.

| Method | Header | Use Case |
|--------|--------|----------|
| API Key | `X-API-Key: <key>` | Programmatic access, CI/CD, integrations |
| JWT Bearer | `Authorization: Bearer <token>` | Browser sessions, SPA auth |

### API Key format

- Keys are prefixed `ck_live_<32 random characters>` for easy identification.
- Only the SHA-256 hash is stored. The plaintext is shown once at creation.
- Keys can expire (`expiresAt`) and be revoked (`revokedAt`).

### JWT flow

1. User logs in with email/password.
2. `JwtTokenValidator.issueToken()` creates a token with `actorId`, `orgId`, `roles`, `sessionId`.
3. On subsequent requests, the `CompositeAuthenticationProvider` extracts and validates the token.
4. On logout, `revokeToken()` marks the token as revoked.

### Authenticated principal

Both methods produce an `AuthenticatedPrincipal`:

```typescript
interface AuthenticatedPrincipal {
  actorId:        string;    // user or service ID
  organizationId: string;    // tenant scope
  roles:          string[];  // role names
  permissions:    string[];  // derived from roles
  authMethod:     'API_KEY' | 'JWT' | 'OAUTH2' | 'SERVICE_ACCOUNT';
}
```

### Password hashing

PBKDF2 with SHA-256, 100,000 iterations, 16-byte random salt. Hash format: `pbkdf2$<iterations>$<salt_hex>$<key_hex>`.

### Brute-force protection

5 failed login attempts lock the account for 15 minutes. `LoginAttemptRepository` tracks all attempts. `AccountLockedError` (HTTP 423) is returned for locked accounts.

### Public endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Service health check |
| GET | `/api/v1/ready` | Readiness probe |
| GET | `/api/v1/version` | API version info |
| GET | `/api/v1/openapi` | OpenAPI 3.1 specification |

---

## Authorization (RBAC)

### Roles

| Role | Scope | Description |
|------|-------|-------------|
| `PLATFORM_ADMIN` | Platform-wide | Full platform access — all operations |
| `ORGANIZATION_ADMIN` | Org-wide | Full org access — all operations within their org |
| `WORKFLOW_EDITOR` | Org-wide | Create, read, and publish workflows |
| `EXECUTION_OPERATOR` | Org-wide | Create, read, pause, resume, cancel executions; read telemetry |
| `APPROVER` | Org-wide | Read and decide approvals; read executions |
| `VIEWER` | Org-wide | Read-only access to executions, workflows, approvals, telemetry |

Custom roles can be created per organization with any subset of the 18 permissions.

### Permission catalog (18 permissions)

| Permission | Resource | Action |
|------------|----------|--------|
| `execution:create` | execution | create |
| `execution:read` | execution | read |
| `execution:update` | execution | update |
| `execution:cancel` | execution | cancel |
| `execution:resume` | execution | resume |
| `workflow:create` | workflow | create |
| `workflow:update` | workflow | update |
| `workflow:publish` | workflow | publish |
| `workflow:delete` | workflow | delete |
| `workflow:read` | workflow | read |
| `approval:read` | approval | read |
| `approval:decide` | approval | decide |
| `telemetry:read` | telemetry | read |
| `memory:read` | memory | read |
| `memory:write` | memory | write |
| `organization:manage` | organization | manage |
| `users:manage` | users | manage |
| `api_keys:manage` | api_keys | manage |

### Authorization chain

```
Request → Auth Middleware → Principal
    │
    ▼
Authorization Middleware
    ├── 1. Organization membership check
    ├── 2. Role check
    ├── 3. Permission check (18 permissions)
    ├── 4. Resource ownership check
    └── 5. Policy evaluation (suspended org, privilege escalation)
```

Cross-organization access returns `404` (not `403`) to hide resource existence from users outside the owning organization.

---

## Key Endpoints by Domain

### Workflows

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/v1/workflows` | `workflow:create` | Create a workflow |
| GET | `/api/v1/workflows` | `workflow:read` | List workflows (paginated) |
| GET | `/api/v1/workflows/{workflowId}` | `workflow:read` | Get a workflow |
| PUT | `/api/v1/workflows/{workflowId}` | `workflow:update` | Update a workflow |
| POST | `/api/v1/workflows/{workflowId}/publish` | `workflow:publish` | Activate a workflow version |
| DELETE | `/api/v1/workflows/{workflowId}` | `workflow:delete` | Delete a workflow |

**Create workflow request:**

```json
{
  "name": "Sales Analysis Pipeline",
  "description": "Analyzes sales data and generates recommendations.",
  "nodes": [
    { "nodeId": "n1", "type": "INTELLIGENCE", "label": "Intent Analysis", "order": 1, "dependsOn": [], "requiresApproval": false },
    { "nodeId": "n2", "type": "FINALIZATION", "label": "Finalize", "order": 2, "dependsOn": ["n1"], "requiresApproval": false }
  ],
  "edges": [
    { "sourceNodeId": "n1", "targetNodeId": "n2", "condition": null }
  ],
  "mode": "SEQUENTIAL"
}
```

The response (201) returns a `WorkflowResponseDto` with `workflowId`, `version: "1"`, `contentHash`, and `active: false`.

### Executions

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/v1/executions` | `execution:create` | Submit a new execution (async, 202) |
| GET | `/api/v1/executions` | `execution:read` | List executions (paginated) |
| GET | `/api/v1/executions/{executionId}` | `execution:read` | Get execution status |
| POST | `/api/v1/executions/{executionId}/pause` | `execution:update` | Pause execution |
| POST | `/api/v1/executions/{executionId}/resume` | `execution:resume` | Resume execution |
| POST | `/api/v1/executions/{executionId}/cancel` | `execution:cancel` | Cancel execution |
| GET | `/api/v1/executions/{executionId}/events` | `execution:read` | Get execution events |

**Create execution request:**

```json
{
  "workflowId": "wf-abc123",
  "input": { "prompt": "Analyze sales performance and recommend actions." },
  "idempotencyKey": "idem-001",
  "metadata": {}
}
```

Returns `202 Accepted` with `executionId`, `status: "CREATED"`, and HATEOAS links (`self`, `events`).

### Approvals

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/approvals` | `approval:read` | List pending approvals (paginated) |
| GET | `/api/v1/approvals/{approvalId}` | `approval:read` | Get approval details |
| POST | `/api/v1/approvals/{approvalId}/approve` | `approval:decide` | Approve |
| POST | `/api/v1/approvals/{approvalId}/reject` | `approval:decide` | Reject |
| POST | `/api/v1/approvals/{approvalId}/request-changes` | `approval:decide` | Request changes |

When a workflow node with `requiresApproval: true` is reached, the runtime creates an `ApprovalRequest` and pauses the execution.

### Telemetry

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/executions/{executionId}/events` | `telemetry:read` | Execution events |
| GET | `/api/v1/executions/{executionId}/trace` | `telemetry:read` | Execution trace |

### Memory

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/memory` | `memory:read` | Query cognitive memory |
| POST | `/api/v1/memory` | `memory:write` | Store memory |

### Tools

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/tools` | — | List registered tools/capabilities |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/health` | Public | Service health check |
| GET | `/api/v1/ready` | Public | Readiness probe |
| GET | `/api/v1/version` | Public | API version info |
| GET | `/api/v1/openapi` | Public | OpenAPI 3.1 spec |

---

## SDK Usage (@compilerai/sdk-typescript)

The official TypeScript SDK provides a typed client for the Platform API.

### Installation

```bash
npm install @compilerai/sdk-typescript
```

### Initialization

```typescript
import { CompilerAI } from '@compilerai/sdk-typescript';

const client = new CompilerAI({
  apiKey: 'ck_live_your_api_key',
  organizationId: 'org-abc123',
  baseUrl: 'https://api.your-domain.com',  // optional, defaults to http://localhost:3000
  timeoutMs: 30_000,        // optional, default 30s
  maxRetries: 2,            // optional, default 2
  retryDelayMs: 500,        // optional, default 500ms
});
```

### Resources

The client exposes typed resources that mirror the API domains:

| Resource | Methods |
|----------|---------|
| `client.executions` | `create()`, `get()`, `list()`, `pause()`, `resume()`, `cancel()`, `events()` |
| `client.workflows` | `create()`, `get()`, `list()`, `update()`, `publish()`, `delete()` |
| `client.approvals` | `list()`, `get()`, `approve()`, `reject()`, `requestChanges()` |
| `client.telemetry` | `events()`, `trace()` |
| `client.memory` | `query()`, `store()` |
| `client.tools` | `list()` |
| `client.health` | `health()`, `ready()`, `version()` |

### Example

```typescript
// Create and execute a workflow
const workflow = await client.workflows.create({
  name: 'Daily Report',
  nodes: [/* ... */],
  edges: [/* ... */],
  mode: 'SEQUENTIAL',
});

await client.workflows.publish(workflow.workflowId);

const execution = await client.executions.create({
  workflowId: workflow.workflowId,
  input: { prompt: 'Generate today\'s sales report' },
  idempotencyKey: 'daily-2026-07-26',
});

// Poll for completion
const status = await client.executions.get(execution.executionId);
console.log(status.status);  // 'CREATED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED'
```

### SDK constants

| Constant | Value |
|----------|-------|
| `API_VERSION` | `'v1'` |
| `DEFAULT_BASE_URL` | `'http://localhost:3000'` |
| `SDK_VERSION` | `'1.0.0'` |
| `DEFAULT_TIMEOUT_MS` | `30_000` |
| `DEFAULT_MAX_RETRIES` | `2` |
| `DEFAULT_RETRY_DELAY_MS` | `500` |
| `IDEMPOTENCY_HEADER` | `'Idempotency-Key'` |
| `REQUEST_ID_HEADER` | `'X-Request-Id'` |
| `CORRELATION_ID_HEADER` | `'X-Correlation-Id'` |

---

## Error Handling and Error Codes

Every error response follows a consistent structure:

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

### Error code reference (16 codes)

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
| `INVALID_EXECUTION_STATE` | 409 | No | Invalid state transition |
| `INVALID_RESUME_TOKEN` | 409 | No | Resume token expired, consumed, or invalid |
| `IDEMPOTENCY_CONFLICT` | 409 | No | Same idempotency key with different request body |
| `WORKFLOW_VALIDATION_FAILED` | 422 | No | Workflow definition has structural errors |
| `RATE_LIMIT_EXCEEDED` | 429 | Yes | Rate limit exceeded — retry after window resets |
| `REQUEST_TIMEOUT` | 408 | Yes | Request exceeded the maximum duration |
| `RUNTIME_UNAVAILABLE` | 503 | Yes | Runtime is temporarily unavailable |
| `INTERNAL_ERROR` | 500 | No | Unexpected internal error |

### Retry behavior

Clients should retry requests when `retryable: true`. Use exponential backoff with jitter. The `details` array may contain a `retry-after` hint for rate-limited responses.

### Correlation IDs

Every response (success and error) includes `meta.correlationId`. If the client provides an `X-Correlation-Id` header, it is echoed back. Otherwise, a new correlation ID is generated. This enables distributed tracing across the platform.

### SDK error classes

The SDK throws typed errors that map to the API error codes:

| SDK Error Class | Code | HTTP |
|-----------------|------|------|
| `AuthenticationError` | `AUTHENTICATION_REQUIRED` | 401 |
| `AuthorizationError` | `ACCESS_DENIED` | 403 |
| `ValidationError` | `VALIDATION_ERROR` | 400 |
| `NotFoundError` | `RESOURCE_NOT_FOUND` | 404 |
| `ConflictError` | `CONFLICT` | 409 |
| `RateLimitError` | `RATE_LIMIT_EXCEEDED` | 429 |

All SDK errors extend `CompilerAIError` and expose `code`, `httpStatus`, `retryable`, `details`, and `meta`.

---

## Rate Limiting

The API enforces rate limiting via a sliding window per organization/endpoint. The `InMemoryRateLimiter` implements `IRateLimiter` and is configured at API creation time:

```typescript
createPlatformApi({
  clock: () => new Date().toISOString(),
  idGenerator: () => crypto.randomUUID(),
  rateLimitPerOrg: 1000,       // requests per window per org
  rateLimitWindowMs: 60_000,   // 1 minute window
});
```

When the limit is exceeded, the API returns `429 RATE_LIMIT_EXCEEDED` with `retryable: true` and a `retry-after` hint in the `details` array.

---

## Idempotency

POST endpoints support idempotency for safe retries. Provide an `idempotencyKey` in the request body and/or an `Idempotency-Key` header.

| Scenario | Result |
|----------|--------|
| First request with key | Processed normally; response cached |
| Retry with same key + same body | Cached response returned, no side effects |
| Retry with same key + different body | `409 IDEMPOTENCY_CONFLICT` |

Cached records expire after 24 hours (86,400,000 ms). Request bodies are hashed with the djb2 algorithm for deterministic comparison.
