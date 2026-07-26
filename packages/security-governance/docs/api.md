# API Reference

The public API of `@compilerai/security-governance` is the `SecurityGovernance` class,
which implements the `ISecurityGovernance` interface. It wires together every subsystem
and exposes a single facade for identity, authentication, authorization, policy,
encryption, secrets, audit, compliance, and telemetry.

## SecurityGovernance class

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();
```

The constructor takes no arguments and initializes all subsystems with sensible
defaults: a `MockAuthProvider`, an empty `PolicyEngine`, an `EncryptionService` with a
generated `default` key, an `InMemorySecretStore` wired to the encryption service, and
a `ComplianceManager` seeded with ISO 27001, SOC 2, GDPR, and NIS2 control catalogs.

### Public subsystem properties

Each subsystem is exposed as a readonly property for advanced use:

| Property | Type |
|----------|------|
| `sg.identity` | `IdentityManager` |
| `sg.auth` | `AuthenticationManager` |
| `sg.authz` | `AuthorizationEngine` |
| `sg.policies` | `PolicyEngine` |
| `sg.secrets` | `SecretsManager` |
| `sg.encryption` | `EncryptionService` |
| `sg.audit` | `AuditLog` |
| `sg.compliance` | `ComplianceManager` |
| `sg.telemetry` | `ITelemetryEngine` |

## ISecurityGovernance — 8 public API methods

| # | Method | Signature | Returns |
|---|--------|-----------|---------|
| 1 | `authenticate` | `(credential: AuthCredential) => Promise<AuthResult>` | `AuthResult` |
| 2 | `authorize` | `(request: AuthorizationRequest) => AuthorizationDecision` | `AuthorizationDecision` |
| 3 | `evaluatePolicy` | `(request: PolicyEvaluationRequest) => PolicyEvaluationResult` | `PolicyEvaluationResult` |
| 4 | `encrypt` | `(plaintext: string, keyId?: string) => EncryptedData` | `EncryptedData` |
| 5 | `decrypt` | `(data: EncryptedData, keyId?: string) => string` | `string` |
| 6 | `storeSecret` | `(name, value, type, organizationId) => SecretRecord` | `SecretRecord` |
| 7 | `getSecret` | `(id: string) => string \| undefined` | `string \| undefined` |
| 8 | `writeAuditLog` | `(event: Omit<AuditEvent, 'id' \| 'timestamp'>) => AuditEvent` | `AuditEvent` |

### authenticate(credential)

Validates the supplied `AuthCredential` (containing `identityId`, `method`, `token`,
optional `expiresAt`, and `metadata`) against the registered provider for that method.
On success, returns an `AuthResult` with `authenticated: true`, a minted `token`, and
`expiresAt`. The facade also emits an `authentication.success`/`authentication.failed`
telemetry event and writes a `login` audit event.

### authorize(request)

Evaluates an `AuthorizationRequest` (`identityId`, `resource`, `action`,
`organizationId`, `roles`, optional `abacContext`) through RBAC, ABAC, and the policy
engine. Returns an `AuthorizationDecision` with `allowed`, `reason`, `matchedBy`
(`'rbac' | 'abac' | 'policy' | 'denied'`), optional `conditions`, and `evaluatedAt`.
The facade emits `authorization.granted`/`authorization.denied` telemetry and writes an
`auth_denied` audit event on denial.

### evaluatePolicy(request)

Evaluates a `PolicyEvaluationRequest` against the registered policy rules and returns a
`PolicyEvaluationResult` with the `decision` (`PolicyEffect`), `matchedRules`, a
`reason`, a full `trace`, and `evaluatedAt`. Emits a `policy.evaluated` telemetry event.

### encrypt(plaintext, keyId?)

Encrypts `plaintext` using AES-256-CBC with the named key (defaults to the current
key). Returns `EncryptedData` (`ciphertext`, `iv`, `algorithm`, `keyId`). Emits an
`encryption.completed` telemetry event.

### decrypt(data, keyId?)

Decrypts `EncryptedData` back to the original plaintext string using the key named in
`data.keyId` (or the `keyId` argument).

### storeSecret(name, value, type, organizationId)

Encrypts `value` and stores it as a `SecretRecord` (`api_key` | `oauth_token` |
`certificate` | `internal`). The plaintext never persists — only the encrypted value is
stored. Writes a `secret_access` audit event with `operation: 'store'`.

### getSecret(id)

Retrieves and decrypts the secret with the given id, returning the plaintext or
`undefined` if not found. On a successful retrieval, emits a `secret.accessed`
telemetry event and writes a `secret_access` audit event with `operation: 'retrieve'`.

### writeAuditLog(event)

Appends an `AuditEvent` (supplying everything except `id` and `timestamp`, which are
assigned automatically). Emits an `audit.written` telemetry event and returns the full
event.

## Additional facade methods

Beyond the 8 `ISecurityGovernance` methods, `SecurityGovernance` exposes convenience
methods: `createIdentity`, `getIdentity`, `setIdentities`, `validateToken`,
`addPolicyRule`, `removePolicyRule`, `hash`, `sign`, `verify`, `rotateKey`,
`rotateSecret`, `listSecrets`, `deleteSecret`, `queryAuditLog`,
`getComplianceControls`, `assessCompliance`, `setComplianceControlStatus`,
`getAllFrameworks`, `getTelemetryEvents`, `getTelemetryEventsByType`,
`createABACContext`, and the `createPolicyRule` factory function.

## Code example

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

// 1. authenticate
const user = sg.createIdentity('user', 'Alice', 'org-1');
const auth = await sg.authenticate({ identityId: user.id, method: 'mock', token: 't', metadata: {} });

// 2. authorize
const decision = sg.authorize({
  identityId: user.id, resource: 'knowledge_graph', action: 'read',
  organizationId: 'org-1', roles: ['employee'],
});

// 3. evaluatePolicy
const policy = sg.evaluatePolicy({
  identityId: user.id, resource: 'knowledge_graph', action: 'read',
  organizationId: 'org-1', roles: ['employee'],
});

// 4. encrypt / 5. decrypt
const enc = sg.encrypt('secret');
const dec = sg.decrypt(enc);

// 6. storeSecret / 7. getSecret
const rec = sg.storeSecret('api-key', 'val', 'api_key', 'org-1');
const val = sg.getSecret(rec.id);

// 8. writeAuditLog
sg.writeAuditLog({ actor: user.id, actorType: 'user', resource: 'kg', action: 'kg_access', result: 'success', organizationId: 'org-1', details: {} });
```
