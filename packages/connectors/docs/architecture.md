# Architecture

## Design Goals

1. **Single integration point** — All external service connections flow through this package.
2. **Interface-driven** — Every contract is a TypeScript interface. No real API calls are made.
3. **No secrets in code** — Credentials are passed at runtime, never embedded.
4. **Zero external dependencies** — The package has no runtime dependencies.
5. **Strict type safety** — TypeScript strict mode with zero `any` usage.
6. **Resilient by default** — Retry, timeout, circuit breaking, and rate limiting built into the runtime pipeline.

## Module Structure

```
src/
├── types/index.ts              # Core interfaces and type definitions
├── core/
│   ├── BaseConnector.ts        # Abstract base class implementing Connector
│   ├── BaseConnectorProvider.ts  # Abstract base for providers
│   └── ConnectorErrors.ts      # Original error hierarchy
├── registry/
│   └── ConnectorRegistry.ts    # Central registry for providers
├── auth/
│   ├── index.ts                # Auth interfaces (OAuth2, API Key, Bearer)
│   ├── TokenRefreshProvider.ts # Token refresh provider implementations
│   ├── OAuth2TokenManager.ts   # OAuth2 token lifecycle with refresh mutex
│   ├── ApiKeyAuthProvider.ts   # API key authentication
│   └── BearerTokenAuthProvider.ts  # Bearer token authentication
├── credentials/
│   ├── CredentialStore.ts      # ICredentialStore interface + types
│   ├── InMemoryCredentialStore.ts  # Map-based credential store
│   ├── CredentialEncryptionProvider.ts  # AES-256-GCM encryption
│   └── CredentialResolver.ts   # Encrypt/decrypt + store coordination
├── resilience/
│   ├── RetryPolicy.ts          # Retry decision logic
│   ├── ExponentialBackoff.ts   # Backoff calculation + sleep
│   ├── TimeoutPolicy.ts        # AbortSignal-based timeout
│   ├── CircuitBreaker.ts       # CLOSED/OPEN/HALF_OPEN state machine
│   └── RateLimiter.ts          # Token bucket rate limiter
├── observability/
│   ├── sanitize.ts             # Metadata secret redaction
│   ├── ConnectorTelemetry.ts   # Event stream
│   ├── ConnectorMetrics.ts     # Aggregated counters
│   ├── ConnectorTrace.ts       # Distributed trace spans
│   └── ConnectorAuditEvent.ts  # Immutable audit events
├── runtime/
│   ├── ConnectorExecutionResult.ts  # Operation contracts
│   ├── ConnectorExecutionContext.ts # Context factory
│   ├── ConnectorOperationExecutor.ts  # Operation registry + executor
│   ├── ConnectorExecutionPipeline.ts  # Full pipeline orchestration
│   ├── ConnectorRuntime.ts     # Public runtime facade
│   └── index.ts                # Barrel exports
├── providers/
│   ├── microsoft365/           # Provider placeholders (8)
│   ├── google/
│   ├── slack/
│   ├── github/
│   ├── jira/
│   ├── notion/
│   ├── salesforce/
│   ├── hubspot/
│   ├── test/                   # Test connector with 7 operations
│   └── index.ts                # Barrel exports + createDefaultRegistry
├── utils/index.ts              # Helper functions
└── index.ts                    # Public API surface
```

## Core Interfaces

### Connector
The runtime instance that executes capabilities against an external service. Lifecycle: `register → initialize → execute → disconnect`.

### ConnectorProvider
Factory that creates connector instances and exposes static metadata, capabilities, and auth requirements.

### ConnectorRuntime
The execution facade that orchestrates operations through the resilience pipeline. See [Runtime documentation](./runtime.md).

### ConnectorOperation
Contract for executable operations with validation, timeout, and retry metadata.

## Runtime Data Flow

```
Application
    ↓
ConnectorRuntime.execute(request)
    ↓
ConnectorExecutionPipeline
    ├── Rate Limiter check
    ├── Circuit Breaker check
    ├── Timeout + AbortSignal creation
    ├── Operation execution (with retry)
    ├── Telemetry emission
    ├── Metrics recording
    └── Audit logging
    ↓
ConnectorOperationResult { success, data, error, durationMs, attempts, ... }
```

## Dependency Graph

The module graph is strictly acyclic:

```
types ← core ← registry
types ← core ← providers
types ← auth ← credentials
types ← errors ← runtime
types ← resilience ← runtime
types ← observability ← runtime
runtime ← providers/test
registry ← providers/index
```

No module imports from a higher-level module. `index.ts` is the only file that imports from all modules.

## Error Model

### Foundation Errors (Sprint 22)

| Error | Code |
|-------|------|
| ConnectorAlreadyRegisteredError | CONNECTOR_ALREADY_REGISTERED |
| ConnectorNotFoundError | CONNECTOR_NOT_FOUND |
| ConnectorValidationError | CONNECTOR_VALIDATION_FAILED |
| ConnectorAuthenticationError | CONNECTOR_AUTH_FAILED |
| ConnectorCapabilityError | CONNECTOR_CAPABILITY_NOT_SUPPORTED |

### Runtime Errors (Sprint 23)

| Error | Code | Retryable |
|-------|------|-----------|
| ConnectorRuntimeError | varies | varies |
| ConnectorAuthenticationError | AUTHENTICATION_ERROR | No |
| ConnectorRateLimitError | RATE_LIMIT_ERROR | Yes |
| ConnectorTimeoutError | TIMEOUT_ERROR | No |
| ConnectorCircuitOpenError | CIRCUIT_OPEN_ERROR | No |

See [Error Model documentation](./error-model.md) for details.
