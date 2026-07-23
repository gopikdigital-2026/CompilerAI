# CompilerAI Enterprise Connectors

The single integration point between CompilerAI and external services.

## Overview

The Connectors package provides a unified framework for connecting CompilerAI to third-party services. It includes a full execution runtime with resilience patterns (retry, timeout, circuit breaker, rate limiting), credential management with encryption, OAuth2 token management, and comprehensive observability (telemetry, metrics, tracing, audit logging).

## Supported Providers

| Provider | ID | Category | Auth Scheme |
|----------|----|----------|-------------|
| Microsoft 365 | `microsoft365` | Productivity | OAuth2 |
| Google Workspace | `google_workspace` | Productivity | OAuth2 |
| Slack | `slack` | Communication | OAuth2 |
| GitHub | `github` | Development | OAuth2 |
| Jira | `jira` | Project Management | OAuth2 |
| Notion | `notion` | Knowledge | Bearer Token |
| Salesforce | `salesforce` | CRM | OAuth2 |
| HubSpot | `hubspot` | CRM | OAuth2 |
| Test Connector | `test-connector` | Testing | None |

## Quick Start

### Registry-Based Usage (Foundation)

```typescript
import { createDefaultRegistry, makeContext } from '@compilerai/connectors';

const registry = createDefaultRegistry();
const connector = registry.createConnector('slack', 'org-123', null);
const ctx = makeContext('org-123', 'user-456');
await connector.initialize(credentials, ctx);
const result = await connector.execute('send_message', { channel: '#general', text: 'Hello!' }, ctx);
await connector.disconnect();
```

### Runtime-Based Usage (Sprint 23)

```typescript
import {
  ConnectorRuntime,
  createExecutionContext,
  TEST_CONNECTOR_ID,
  TEST_OPERATIONS,
} from '@compilerai/connectors';

const runtime = new ConnectorRuntime();

// Register operations
for (const op of TEST_OPERATIONS) {
  runtime.registerOperation(TEST_CONNECTOR_ID, op);
}

// Execute with full resilience pipeline
const context = createExecutionContext({ organizationId: 'org-1', userId: 'user-1' });
const result = await runtime.execute({
  connectorId: TEST_CONNECTOR_ID,
  operation: 'echo',
  input: { message: 'hello' },
  context,
});

// Access observability
runtime.getTelemetry().getEvents();
runtime.getMetrics().getSnapshot({ connectorId: 'test-connector', organizationId: 'org-1', operation: 'echo' });
runtime.getTrace().getSpansByExecution(result.executionId);
runtime.getAuditLog().getEvents();
```

## Runtime Pipeline

Every operation flows through:

1. Rate Limit check (token bucket)
2. Circuit Breaker check (CLOSED/OPEN/HALF_OPEN)
3. Timeout enforcement (AbortSignal)
4. Operation execution (with input validation)
5. Retry with exponential backoff + jitter
6. Telemetry emission + metrics recording + audit logging

## Key Features

- **Resilience**: Retry with exponential backoff, circuit breaker, rate limiter, timeout
- **Credentials**: AES-256-GCM encryption, in-memory store, credential resolver
- **Auth**: OAuth2 token manager with refresh mutex, API key, bearer token providers
- **Observability**: Telemetry events, metrics snapshots, trace spans, immutable audit log
- **Security**: Metadata sanitization (recursive secret redaction), credential isolation
- **Zero dependencies**: No runtime dependencies, no HTTP calls, no hardcoded secrets
- **Strict TypeScript**: Zero `any`, full type safety

## Documentation

- [Runtime](./docs/runtime.md) — Execution pipeline and ConnectorRuntime facade
- [Authentication](./docs/authentication.md) — OAuth2, API key, bearer token providers
- [Credentials](./docs/credentials.md) — Credential store, encryption, resolver
- [Resilience](./docs/resilience.md) — Retry, timeout, circuit breaker, rate limiter
- [Observability](./docs/observability.md) — Telemetry, metrics, tracing, audit
- [Error Model](./docs/error-model.md) — Error hierarchy and codes
- [Security](./docs/security-runtime.md) — Encryption, sanitization, isolation
- [Architecture](./docs/architecture.md) — Module structure and data flow
- [Roadmap](./docs/roadmap.md) — Version plan and future work

## Creating a Custom Connector

```typescript
import { BaseConnector, ConnectorRegistry } from '@compilerai/connectors';
import type { Connector, ConnectorProvider, ConnectorMetadata, ConnectorCapability, ConnectorAuthRequirements } from '@compilerai/connectors';

class MyConnector extends BaseConnector {
  protected async onInitialize(): Promise<void> { /* setup */ }
  protected async onExecute(capability: string, input: Record<string, unknown>): Promise<unknown> {
    return { result: 'done' };
  }
}

class MyProvider implements ConnectorProvider {
  readonly providerId = 'my_service';
  getMetadata(): ConnectorMetadata { /* ... */ }
  getCapabilities(): ConnectorCapability[] { /* ... */ }
  getAuthRequirements(): ConnectorAuthRequirements { /* ... */ }
  createConnector(): Connector { return new MyConnector(/* ... */); }
}

const registry = new ConnectorRegistry();
registry.registerProvider(new MyProvider());
```

## Design Principles

- **Interfaces only** — No real HTTP calls. Providers expose metadata, capabilities, and auth requirements.
- **No secrets** — No credentials or tokens are embedded in the code.
- **Strict TypeScript** — Zero `any` usage, full type safety.
- **No circular dependencies** — Clean acyclic module graph.
- **No external dependencies** — Pure TypeScript, zero runtime deps.
- **Resilient by default** — Retry, timeout, circuit breaking, and rate limiting built in.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| runtime.test.ts | 15 | Runtime facade, operations, telemetry, registry, reset |
| retry.test.ts | 19 | RetryPolicy decisions, backoff calculation, sleep with abort |
| timeout.test.ts | 12 | Timeout resolution, AbortSignal creation, error detection |
| circuit-breaker.test.ts | 16 | State machine, recovery, isolation, reset |
| rate-limiter.test.ts | 14 | Token bucket, refill, isolation, reset, error class |
| credentials.test.ts | 16 | Store CRUD, encryption, resolver, rotation |
| oauth2.test.ts | 14 | Token management, refresh mutex, cache, providers |
| observability.test.ts | 30 | Telemetry, metrics, trace, audit, sanitization |
| runtime-integration.test.ts | 8 | Full pipeline integration tests |
| **Total** | **236** | All passing |
