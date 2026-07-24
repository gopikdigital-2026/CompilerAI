# GitHub Connector — Authentication

## Supported Schemes

### Personal Access Token (PAT)

The GitHub connector supports both classic and fine-grained Personal Access Tokens. The token is stored securely via the `CredentialResolver` and `ICredentialStore` infrastructure from Sprint 23.

**Credential types accepted:**

| Credential Type | Field Name | Description |
|----------------|------------|-------------|
| `oauth2` | `accessToken` | Standard PAT or OAuth token |
| `api_key` | `apiKey` | Treated as a bearer token |
| `bearer` | `token` | Direct bearer token |

All three types resolve to a `Bearer` token in the `Authorization` header.

**Required scopes for classic PAT:**

- `repo` — Repository access (issues, PRs, commits)
- `workflow` — GitHub Actions access
- `read:org` — Organization read access

### GitHub App Authentication (Future)

GitHub App authentication (JWT + installation tokens) is documented in `GitHubAppAuthContracts.ts` but not yet implemented. The constant `GITHUB_APP_AUTH_NOT_IMPLEMENTED` marks this as a future feature.

## Token Resolution Flow

```
Operation.execute()
  └─ GitHubTokenAuthAdapter.getToken(organizationId)
       └─ CredentialResolver.resolve(connectorId, organizationId, userId)
            └─ ICredentialStore.get()
                 └─ ICredentialEncryptionProvider.decrypt()
                      └─ Returns plaintext token
```

## Security

- Tokens are never logged, included in error messages, or passed to telemetry events.
- The `sanitizeMetadata()` function from Sprint 23 automatically redacts any key matching `token`, `authorization`, `apikey`, `secret`, `password`, or `bearer` (case-insensitive).
- Empty tokens result in `ConnectorAuthenticationError`.
- Missing credentials result in `ConnectorAuthenticationError` with a message that does not reveal the token value.

## Multi-Tenant Isolation

Credentials are keyed by `connectorId:organizationId:userId`, ensuring organizations cannot access each other's tokens. The `GitHubTokenAuthAdapter` always passes the `organizationId` from the execution context.
