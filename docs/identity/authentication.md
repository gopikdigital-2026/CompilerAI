# Authentication

## Auth Methods

| Method | Header | Use Case |
|--------|--------|----------|
| JWT | `Authorization: Bearer <token>` | Browser sessions, SPA auth |
| API Key | `X-API-Key: <key>` | Programmatic access, CI/CD |
| OAuth2 | (future) | Google, Microsoft, GitHub SSO |
| OIDC | (future) | Enterprise SSO |

## Interfaces

- `IAuthenticationProvider` — Entry point: `authenticate(req) → Principal | null`
- `ITokenValidator` — Issue, validate, revoke JWT tokens
- `IApiKeyValidator` — Validate API keys against stored hashes
- `IPasswordHasher` — Hash and verify passwords (PBKDF2-SHA256)

## JWT Flow

1. User logs in with email/password
2. `JwtTokenValidator.issueToken()` creates a token with actorId, orgId, roles, sessionId
3. Token is returned to client
4. On subsequent requests, `CompositeAuthenticationProvider` extracts and validates the token
5. On logout, `revokeToken()` marks the token as revoked

## API Key Flow

1. Admin creates API key via `ApiKeyService.createApiKey()`
2. Secret key is shown **once** — only SHA-256 hash is stored
3. On requests, `ApiKeyValidator.validateApiKey()` hashes the provided key and looks up the hash
4. Expired or revoked keys throw `ApiKeyExpiredError` / `ApiKeyRevokedError`

## Composite Provider

`CompositeAuthenticationProvider` tries API key first, then JWT. Throws `AuthenticationError` on invalid credentials, returns `null` when no credentials present.

## Password Hashing

Uses PBKDF2 with SHA-256, 100,000 iterations, 16-byte random salt. Hash format: `pbkdf2$<iterations>$<salt_hex>$<key_hex>`.

## Future: OAuth2 / OIDC

`IOAuthProvider` interface is defined. Future providers:
- `GoogleOAuthProvider` — Google sign-in
- `MicrosoftOAuthProvider` — Microsoft Entra ID
- `GitHubOAuthProvider` — GitHub OAuth
- `OIDCProvider` — Generic OpenID Connect
