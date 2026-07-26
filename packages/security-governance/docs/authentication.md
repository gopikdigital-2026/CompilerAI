# Authentication

The Authentication module verifies that an identity is who it claims to be and issues
time-limited tokens that can be validated and refreshed. It is built around a pluggable
provider model so that enterprise identity providers can be registered alongside the
built-in mock provider.

## Authentication methods

`@compilerai/security-governance` supports 6 authentication methods via the `AuthMethod`
type:

| Method | Description |
|--------|-------------|
| `oauth2` | OAuth 2.0 authorization-code or client-credentials flow |
| `oidc` | OpenID Connect, extending OAuth 2.0 with identity tokens |
| `saml` | SAML 2.0 federation / SSO |
| `api_key` | Long-lived API key authentication |
| `service_account` | Machine identity using service-account credentials |
| `mock` | Built-in provider for offline testing and local development |

The package ships a concrete `MockAuthProvider` implementing the `mock` method. The
other five methods are supported through the `IAuthProvider` interface — you register a
custom provider for the method(s) you need.

## IAuthProvider interface

```typescript
interface IAuthProvider {
  method: AuthMethod;
  authenticate(credentials: AuthCredential): Promise<AuthResult>;
  validateToken(token: string): Promise<AuthResult>;
  refreshToken(token: string): Promise<AuthResult>;
}
```

`AuthCredential` carries the `identityId`, `method`, `token`, optional `expiresAt`, and
a `metadata` bag. `AuthResult` reports `authenticated`, the `identityId` on success, the
`method`, an issued `token` with `expiresAt`, an optional `error` message, and
`metadata`.

A custom provider is registered via `sg.auth.registerProvider(provider)` or the lower-
level `AuthenticationManager.registerProvider`. Once registered, `authenticate` routes
to the provider matching `credential.method`, falling back to the default (`mock`)
provider when no provider is registered for a method.

## Mock provider

`MockAuthProvider` is the default provider and requires no external identity service. It:

1. Looks up the identity by `credentials.identityId` and rejects if not found.
2. Rejects if the identity status is not `active`.
3. Rejects if `credentials.token` is empty.
4. Mints a token `mock-token-<identityId>-<timestamp>` with a 1-hour TTL, stored in an
   internal map.
5. Returns an `AuthResult` with the token, expiry, and the identity's `organizationId`
   in metadata.

`validateToken` checks the token exists, has not expired (expired tokens are deleted),
and that the bound identity is still valid and active. `refreshToken` extends the TTL by
another hour on the same token. `revokeToken` removes a token from the store.

## Token validation and refresh

```typescript
async validateToken(token: string, method?: AuthMethod): Promise<AuthResult>;
async refreshToken(token: string, method?: AuthMethod): Promise<AuthResult>;
```

Both default to the `mock` method when no method is supplied. The facade exposes
`sg.validateToken(token, method?)`; the `AuthenticationManager` additionally exposes
`refreshToken` and `getSupportedMethods()`.

## Code example

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

// Create an active user
const alice = sg.createIdentity('user', 'Alice', 'org-1');

// Authenticate with the mock provider
const auth = await sg.authenticate({
  identityId: alice.id,
  method: 'mock',
  token: 'test',
  metadata: {},
});
console.log(auth.authenticated);  // true
console.log(auth.token);          // 'mock-token-...'
console.log(auth.expiresAt);      // ISO timestamp ~1h ahead

// Validate the issued token
const valid = await sg.validateToken(auth.token!);
console.log(valid.authenticated); // true

// Refresh the token
const refreshed = await sg.auth.refreshToken(auth.token!);
console.log(refreshed.authenticated); // true

// Register a custom provider for API keys
class ApiKeyProvider implements IAuthProvider {
  readonly method = 'api_key' as const;
  async authenticate(c: AuthCredential): Promise<AuthResult> { /* ... */ }
  async validateToken(t: string): Promise<AuthResult> { /* ... */ }
  async refreshToken(t: string): Promise<AuthResult> { /* ... */ }
}
sg.auth.registerProvider(new ApiKeyProvider());
console.log(sg.auth.getSupportedMethods()); // ['mock', 'api_key']

// A failed authentication is reported, not thrown
const bad = await sg.authenticate({
  identityId: 'does-not-exist', method: 'mock', token: 'x', metadata: {},
});
console.log(bad.authenticated);  // false
console.log(bad.error);          // 'Identity not found'
```
