# API Keys

## Model

```typescript
interface ApiKey {
  apiKeyId:        string;
  organizationId:  string;
  name:            string;
  keyPreview:      string;     // masked, for display
  keyHash:         string;     // SHA-256 hash, never plaintext
  scopes:          ApiKeyScope[];
  createdBy:       string;
  expiresAt:       string | null;
  revokedAt:       string | null;
  lastUsedAt:      string | null;
  createdAt:       string;
}
```

## Scopes

| Scope | Allows |
|-------|--------|
| execution:run | Start executions |
| execution:read | Read execution data |
| execution:cancel | Cancel executions |
| workflow:read | Read workflows |
| workflow:write | Create/update workflows |
| approval:read | View approvals |
| approval:decide | Approve/reject |
| telemetry:read | Read telemetry |
| memory:read | Read memory |
| memory:write | Write memory |
| admin | All scopes (bypass) |

## Operations

| Operation | Method |
|-----------|--------|
| Create | `createApiKey(orgId, name, scopes, createdBy, expiresInSeconds?)` |
| Revoke | `revokeApiKey(apiKeyId)` |
| Regenerate | `regenerateApiKey(apiKeyId)` — revokes old, creates new |
| List | `listApiKeys(orgId)` |

## Security Rules

1. **Only hashes stored** — SHA-256 hash of the secret key. Plaintext is shown once at creation.
2. **Key format** — `ck_live_<32 random chars>` for easy identification
3. **Key preview** — Masked version for display: `ck_live_••••••••1234`
4. **Expiry** — Optional `expiresAt` timestamp. Expired keys throw `ApiKeyExpiredError`.
5. **Revocation** — `revokedAt` timestamp. Revoked keys throw `ApiKeyRevokedError`.
6. **Last used tracking** — `lastUsedAt` updated on each validation
7. **Scope validation** — `hasScope(key, requiredScope)` checks if the key has the required scope (or `admin`)
