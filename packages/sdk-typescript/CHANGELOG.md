# Changelog

## 1.0.0 — 2026-07-22

### Added

- Initial release of `@compilerai/sdk-typescript`
- `CompilerAI` main client class with DI-friendly constructor
- 7 resource clients: `executions`, `workflows`, `approvals`, `telemetry`, `memory`, `tools`, `health`
- `HttpTransport` with fetch-based HTTP, timeout, cancellation, and retry logic
- 9 normalized error classes: `AuthenticationError`, `AuthorizationError`, `ValidationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `TimeoutError`, `NetworkError`, `ServerError`
- Full TypeScript type definitions for all Platform API DTOs
- Idempotency key support via `Idempotency-Key` header
- Request ID and correlation ID on every request
- Configurable timeout (default 30s), max retries (default 2), retry delay (default 500ms)
- Security: API keys never logged, headers sanitized, no secrets in error messages
- 61 tests: config (7), errors (7), transport (17), resources (30)
- Documentation: README, getting-started, error-handling, API gaps
- Examples: basic usage, workflow management, human-approval flow

### Known Limitations

- `memory` and `tools` resources are stubs — no corresponding Platform API endpoints exist yet
- `GET /workflows` does not support pagination on the server side
- `POST /workflows/validate` uses `workflow:read` permission (server inconsistency)
- `GET /executions/:id/telemetry` and `GET /executions/:id/events` are near-duplicate endpoints
