# Security — Runtime Layer

## Overview

The connector runtime layer implements multiple security measures to protect credentials, prevent data leakage, and ensure safe operation execution.

## Credential Encryption

### AES-256-GCM

All credentials are encrypted at rest using AES-256-GCM authenticated encryption:

- **Key derivation**: `scryptSync` with 16-byte random salt
- **IV**: 12-byte random initialization vector per encryption
- **Auth tag**: 16-byte GCM authentication tag
- **Ciphertext format**: `base64(salt + iv + authTag + encryptedData)`

### Key Management

- The `DevelopmentCredentialEncryptionProvider` uses a passphrase-based key
- Production deployments should use a KMS-backed provider
- Key rotation is supported via `rotateKey()` — old data becomes undecryptable

### Encryption in Transit

The runtime makes no HTTP calls. All operations are local. Encryption protects credentials at rest in the credential store.

## Metadata Sanitization

### Automatic Redaction

All telemetry events, trace spans, and audit events have their metadata sanitized before storage:

```typescript
sanitizeMetadata({ apiKey: 'secret', token: 'xyz', normal: 'visible' })
// → { apiKey: '[REDACTED]', token: '[REDACTED]', normal: 'visible' }
```

### Redacted Patterns

Keys matching these patterns (case-insensitive) are redacted:
- `apiKey`, `api_key`
- `token`
- `password`, `passwd`
- `secret`
- `bearer`
- `authorization`

Sanitization is **recursive** — nested objects are also sanitized.

## Credential Isolation

Credentials are isolated by three dimensions:
1. **Connector ID** — Each connector has separate credentials
2. **Organization ID** — Each organization has separate credentials
3. **User ID** — Optional per-user credentials with org-level fallback

This prevents cross-organization credential access.

## Rate Limiting

Rate limiting is enforced per `organizationId:connectorId:operation:userId`, preventing:
- Single user from overwhelming a connector
- One organization from affecting another
- One operation from blocking another

## Circuit Breaker

The circuit breaker provides fault isolation:
- Failures in one operation do not affect others
- Cascading failures are prevented by opening the circuit
- Monitored error codes are configurable (only real failures counted)

## Timeout Enforcement

All operations have timeout enforcement via `AbortSignal`:
- Default timeout: 30 seconds
- Maximum timeout: 120 seconds
- Operations receive a combined signal (timeout + user cancellation)
- Timers are always cleared after operation completes

## Audit Trail

### Immutable Events

Audit events are frozen with `Object.freeze()` — they cannot be modified after creation. This ensures compliance-grade audit integrity.

### Event Coverage

| Security Event | Audit Type |
|---|---|
| Credential stored | `credential.saved` |
| Credential rotated | `credential.rotated` |
| Credential deleted | `credential.deleted` |
| Token refreshed | `token.refreshed` |
| Token refresh failed | `token.refresh_failed` |
| Execution completed | `execution.completed` |
| Execution failed | `execution.failed` |
| Rate limit hit | `rate_limit.exceeded` |

## No Hardcoded Secrets

The codebase contains:
- No hardcoded API keys or tokens
- No hardcoded passwords
- No hardcoded encryption keys (development key is clearly marked)
- No secrets in test data (all test tokens are obviously fake)

## No External HTTP Calls

The runtime layer makes zero HTTP calls. All operations are executed locally via registered operation handlers. This means:
- No credential leakage via network requests
- No SSRF risks
- No external dependencies at runtime
