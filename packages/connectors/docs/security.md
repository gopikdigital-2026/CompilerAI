# Security

## Principles

1. **No secrets in code** — No API keys, tokens, or credentials are ever embedded in source code.
2. **Credentials passed at runtime** — All credentials flow through `ConnectorCredentials` at initialization time.
3. **Secret masking** — The `maskSecret()` utility is available for logging without exposing full secrets.
4. **Organization isolation** — Connector instances are keyed by `connectorId:organizationId` pairs.
5. **No real HTTP calls** — This package defines contracts only. No outbound network requests are made.

## Authentication Schemes

The package defines interfaces for four authentication schemes:

### OAuth2
- `IOAuth2Flow` — Authorization URL building, code-for-token exchange, token refresh, validation, and revocation
- `OAuth2Config` — Client ID, secret, redirect URI, scopes, endpoints
- `OAuth2Token` — Access token, refresh token, expiry, scope
- Used by: Microsoft 365, Google Workspace, Slack, GitHub, Jira, Salesforce, HubSpot

### API Keys
- `IApiKeyAuth` — API key validation and auth header building
- `ApiKeyConfig` — Key value, header name, optional prefix
- Used by: Notion (internal API key), available as alternative for others

### Bearer Tokens
- `IBearerAuth` — Token validation and auth header building
- `BearerTokenConfig` — Token value and prefix
- Used by: Notion

### Refresh Tokens
- `IRefreshTokenFlow` — Token refresh and expiry checking
- `RefreshTokenConfig` — Refresh token, endpoint, client credentials
- Used by: Microsoft 365, Google Workspace, Jira, Salesforce, HubSpot

## Credential Storage

The `ICredentialStore` interface defines how credentials are persisted:

```typescript
interface ICredentialStore {
  store(connectorId, organizationId, credentials): Promise<void>;
  retrieve(connectorId, organizationId): Promise<StoredCredentials | null>;
  delete(connectorId, organizationId): Promise<boolean>;
  listByOrganization(organizationId): Promise<StoredCredentials[]>;
}
```

`StoredCredentials` contains `encryptedData` — the package never stores plaintext secrets. The encryption implementation is left to the consuming application.

## Scope Management

Each capability declares `requiredScopes`. Providers declare the full set of `scopes` in `ConnectorAuthRequirements`. The registry and connector validate that requested capabilities match granted scopes before execution.

## Security Checklist

- [x] No hardcoded secrets
- [x] No real HTTP calls
- [x] Credentials encrypted at rest (via `ICredentialStore`)
- [x] Secret masking utility for logs
- [x] Organization-scoped connector instances
- [x] Scope validation per capability
- [x] Token expiry checking (`isExpired()`)
- [x] No `any` types (strict TypeScript)
- [x] No circular dependencies
