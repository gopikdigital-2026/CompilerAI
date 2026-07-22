# Compiler Platform API — Architecture

## Overview

The Compiler Platform API is a framework-agnostic REST API that exposes the CompilerAI intelligence platform's execution, workflow, approval, telemetry, and platform management capabilities. It lives at `/api/v1` and follows OpenAPI 3.1 specification.

## Design Principles

### 1. Framework-Agnostic HTTP Abstraction

The API domain layer has zero coupling to any HTTP framework (Express, Fastify, Hono). The core interfaces are:

- **`IHttpAdapter`** — pluggable HTTP server adapter. The in-memory implementation (`InMemoryHttpAdapter`) is used for testing and development. Production adapters for Express/Fastify/Hono can be built without touching domain code.
- **`IRouteRegistry`** — pattern-matching route registry with `:param` syntax support.
- **`HttpHandler`** — `(req: HttpRequest, ctx: RequestContext) => Promise<HttpResponse>`

### 2. Layered Architecture

```
HTTP Adapter (transport)
    ↓
Route Registry (matching)
    ↓
Middleware Pipeline (auth → rate limit → idempotency)
    ↓
Controllers (request handling, DTO mapping)
    ↓
Application Services (orchestration, no business logic duplication)
    ↓
Compiler Runtime (domain logic)
```

### 3. DTO Separation

Domain models (`RuntimeExecution`, `WorkflowDefinition`, `ApprovalRequest`) are never exposed directly. All API responses use dedicated DTOs (`ExecutionResponseDto`, `WorkflowResponseDto`, `ApprovalResponseDto`). Mappers in `DomainMappers.ts` handle the conversion.

### 4. Application Service Layer

Application services bridge controllers and the `CompilerRuntime`. They contain no business logic — only orchestration, DTO-to-domain mapping, and tenant scoping. This prevents duplicating runtime logic at the API level.

## Component Map

| Component | File | Responsibility |
|-----------|------|----------------|
| HTTP Interfaces | `interfaces/HttpInterfaces.ts` | HttpRequest, HttpResponse, HttpHandler, RequestContext |
| Route Registry | `routes/RouteRegistry.ts` | Pattern matching with `:param` syntax |
| In-Memory Adapter | `routes/InMemoryHttpAdapter.ts` | Full HTTP adapter with middleware pipeline |
| Route Registration | `routes/RouteRegistration.ts` | All `/api/v1` route definitions |
| Auth Provider | `auth/AuthInterfaces.ts` | Simulated API key + JWT, 6 roles, 11 permissions |
| Idempotency | `services/IdempotencyService.ts` | Request hashing, conflict detection, cached responses |
| Rate Limiter | `middleware/RateLimitMiddleware.ts` | Sliding window per org/endpoint |
| Validators | `validation/RequestValidators.ts` | Execution, workflow, approval, pagination |
| Mappers | `mappers/DomainMappers.ts` | Domain ↔ DTO conversion |
| Application Services | `services/ApplicationServices.ts` | 5 services bridging controllers to runtime |
| Controllers | `controllers/Controllers.ts` | 6 controllers, 25+ handlers |
| Response Helpers | `services/ResponseHelpers.ts` | ok, created, accepted, paginated, apiError |
| Error Codes | `errors/ApiErrorCodes.ts` | 16 error codes with HTTP status + retryable flags |
| DTOs | `dto/ApiDtos.ts` | 16+ DTO types |
| OpenAPI Spec | `openapi/compiler-platform-api-v1.yaml` | Full OpenAPI 3.1 specification |
| Factory | `PlatformApiFactory.ts` | `createPlatformApi()` — wires everything together |

## Request Flow

1. **HTTP Adapter** receives `HttpRequest`
2. **Route matching** — `RouteRegistry.match()` finds handler + extracts path params
3. **Public path check** — health/readiness/version/openapi bypass auth
4. **Authentication** — `SimulatedAuthenticationProvider.authenticate()` extracts principal from headers
5. **Authorization** — `requirePermission()` checks role-based permissions
6. **Rate limiting** — `InMemoryRateLimiter.check()` enforces per-org limits
7. **Idempotency** — For POST: `IdempotencyService.checkOrStore()` detects duplicates/conflicts
8. **Controller handler** — validates input, calls application service, maps to DTO
9. **Response** — wrapped in `{ data, meta }` or `{ error, meta }` format

## Standard Response Format

### Success

```json
{
  "data": { ... },
  "meta": {
    "requestId": "req-001",
    "correlationId": "corr-001",
    "timestamp": "2026-01-01T00:00:00.000Z",
    "apiVersion": "v1"
  }
}
```

### Paginated

```json
{
  "data": [ ... ],
  "pagination": {
    "nextCursor": "cursor-abc",
    "hasMore": true,
    "limit": 20
  },
  "meta": { ... }
}
```

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": ["workflowId is required."],
    "retryable": false
  },
  "meta": { ... }
}
```

## Multi-Tenancy

Every request is scoped to the authenticated principal's `organizationId`. Application services filter all queries by org. Cross-organization access returns `404` (not `403`) to hide resource existence.

## Testing

The test suite (`tests/PlatformApi.test.ts`) contains 56 tests covering:
- Executions (create, query, result, events, trace, cancel, not found, validation)
- Workflows (create, get, list, validate, version, activate, deactivate, immutability)
- Approvals (list, get, approve, reject, request changes, not found)
- Security (no auth, invalid credentials, insufficient permissions, tenant isolation)
- Platform (health, readiness, version, capabilities, OpenAPI)
- Infrastructure (rate limiting, idempotency, correlation IDs, error format, pagination)
