# Roadmap

## v1.0 (Current — Foundation + Runtime)

### Foundation (Sprint 22)
- [x] Core interfaces: Connector, ConnectorProvider, ConnectorCredentials, ConnectorContext, ConnectorResult, ConnectorError
- [x] Auth interfaces: OAuth2, API Key, Bearer Token, Refresh Token
- [x] ConnectorRegistry with duplicate detection and provider validation
- [x] 8 provider placeholders: Microsoft 365, Google Workspace, Slack, GitHub, Jira, Notion, Salesforce, HubSpot
- [x] BaseConnector abstract class with lifecycle management
- [x] Utility functions (ID generation, secret masking, context building)
- [x] Full test coverage (registry, providers, interfaces, duplicates, lifecycle)
- [x] Documentation (README, architecture, security, roadmap)

### Runtime Layer (Sprint 23)
- [x] ConnectorRuntime facade with execute() entry point
- [x] ConnectorExecutionPipeline with 11-stage orchestration
- [x] Operation contracts (ConnectorOperation) with validation, timeout, retry metadata
- [x] OperationRegistry + ConnectorOperationExecutor
- [x] Error hierarchy: ConnectorRuntimeError + 4 specialized subclasses
- [x] Credential management: ICredentialStore, InMemoryCredentialStore, AES-256-GCM encryption, CredentialResolver
- [x] Auth providers: OAuth2TokenManager (with refresh mutex), ApiKeyAuthProvider, BearerTokenAuthProvider
- [x] Resilience: RetryPolicy (exponential backoff + jitter), CircuitBreaker (3-state), RateLimiter (token bucket), TimeoutPolicy (AbortSignal)
- [x] Observability: ConnectorTelemetry, ConnectorMetrics, ConnectorTrace, AuditLog (immutable events)
- [x] Metadata sanitization (recursive secret redaction)
- [x] Test connector with 7 operations (echo, fail, timeout, rateLimited, requiresAuth, refreshToken, unstableOperation)
- [x] 236 tests across 9 test files (runtime, retry, timeout, circuit-breaker, rate-limiter, credentials, oauth2, observability, integration)
- [x] 7 new docs + 3 updated docs

## v1.1 (Planned — Provider Implementations)

- [ ] Implement real OAuth2 flow for each provider (authorization URL, token exchange)
- [ ] Connect providers to real APIs using the runtime pipeline
- [ ] Add per-provider operation definitions with input/output schemas
- [ ] Add scope validation enforcement before capability execution
- [ ] Implement Supabase-backed credential store (replacing InMemoryCredentialStore)
- [ ] Add KMS-backed encryption provider (replacing DevelopmentCredentialEncryptionProvider)
- [ ] Add token refresh scheduling for long-running connections

## v1.2 (Planned — Advanced Features)

- [ ] Webhook receiver framework for inbound events
- [ ] Streaming support for real-time data (Slack events, GitHub webhooks)
- [ ] Batch operations for bulk API calls
- [ ] Connection pooling and rate limit coordination
- [ ] Health check endpoints per connector
- [ ] Dynamic capability discovery from provider APIs
- [ ] Metrics export to Prometheus/OpenTelemetry
- [ ] Distributed tracing export (Jaeger, Zipkin)

## v2.0 (Planned — Full Integration)

- [ ] Integration with CompilerAI Agent Runtime
- [ ] Integration with CompilerAI Automation Studio
- [ ] Integration with CompilerAI Marketplace
- [ ] Multi-region credential replication
- [ ] Credential rotation policies (automatic expiry)
- [ ] Circuit breaker dashboard
- [ ] Rate limit configuration UI

## New Provider Candidates

- Linear (project management)
- Asana (project management)
- Zendesk (customer support)
- Intercom (customer messaging)
- Stripe (payments)
- Twilio (communications)
- AWS S3 (storage)
- Dropbox (storage)
- Box (storage)
- Mailchimp (marketing)
- Zapier (automation bridge)
- Microsoft Power Automate (automation bridge)

## Creating a New Connector

To add a new provider:

1. Create `src/providers/<service-name>/index.ts`
2. Define `ConnectorMetadata` with id, displayName, description, category, vendor, icon, tags
3. Define `ConnectorCapability[]` with names, methods, input/output schemas, required scopes
4. Define `ConnectorAuthRequirements` with scheme, fields, scopes, endpoints
5. Create a class extending `BaseConnector` implementing `onInitialize()` and `onExecute()`
6. Create a class implementing `ConnectorProvider` with `createConnector()`, `getMetadata()`, `getCapabilities()`, `getAuthRequirements()`
7. Define `ConnectorOperation[]` with validateInput, execute, timeoutMs, retryable, idempotent
8. Export the provider from `src/providers/index.ts` and add to `ALL_PROVIDERS`
9. Add tests to `tests/providers.test.ts`
10. Update README with the new provider
