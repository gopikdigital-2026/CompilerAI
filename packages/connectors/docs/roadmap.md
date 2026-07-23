# Roadmap

## v1.0 (Current — Foundation)

- [x] Core interfaces: Connector, ConnectorProvider, ConnectorCredentials, ConnectorContext, ConnectorResult, ConnectorError
- [x] Auth interfaces: OAuth2, API Key, Bearer Token, Refresh Token
- [x] ConnectorRegistry with duplicate detection and provider validation
- [x] 8 provider placeholders: Microsoft 365, Google Workspace, Slack, GitHub, Jira, Notion, Salesforce, HubSpot
- [x] BaseConnector abstract class with lifecycle management
- [x] Credential store interface
- [x] Utility functions (ID generation, secret masking, context building)
- [x] Full test coverage (registry, providers, interfaces, duplicates, lifecycle)
- [x] Documentation (README, architecture, security, roadmap)

## v1.1 (Planned — Auth Implementation)

- [ ] Implement `IOAuth2Flow` with real authorization URL building and token exchange
- [ ] Implement `IApiKeyAuth` with header building
- [ ] Implement `IBearerAuth` with header building
- [ ] Implement `IRefreshTokenFlow` with automatic refresh before expiry
- [ ] Implement `ICredentialStore` with encryption (Supabase-backed)
- [ ] Add token refresh middleware for long-running connections
- [ ] Add scope validation enforcement before capability execution

## v1.2 (Planned — HTTP Layer)

- [ ] Add HTTP client abstraction (no direct fetch in providers)
- [ ] Implement real API calls for each provider's capabilities
- [ ] Add retry logic with exponential backoff for rate limits
- [ ] Add request/response logging with secret redaction
- [ ] Add circuit breaker pattern for failing services
- [ ] Add timeout enforcement per capability

## v2.0 (Planned — Full Integration)

- [ ] Webhook receiver framework for inbound events
- [ ] Streaming support for real-time data (Slack events, GitHub webhooks)
- [ ] Batch operations for bulk API calls
- [ ] Connection pooling and rate limit coordination
- [ ] Health check endpoints per connector
- [ ] Metrics collection (latency, error rates, usage)
- [ ] Integration with CompilerAI Agent Runtime
- [ ] Integration with CompilerAI Automation Studio
- [ ] Integration with CompilerAI Marketplace
- [ ] Dynamic capability discovery from provider APIs

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
7. Export the provider from `src/providers/index.ts` and add to `ALL_PROVIDERS`
8. Add tests to `tests/providers.test.ts`
9. Update README with the new provider
