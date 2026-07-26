# Examples

This document provides complete, runnable examples covering every major capability of
`@compilerai/security-governance`. Each example is self-contained and uses the
`SecurityGovernance` facade unless a lower-level subsystem is the focus.

> All examples use ESM imports. When running under `tsx` or a bundler, import paths
> resolve through the package barrel. The mock auth provider requires no external
> service, so every example below runs offline.

## 1. Create and manage identities

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

// Create a user with metadata
const alice = sg.createIdentity('user', 'Alice Chen', 'org-1', {
  email: 'alice@compiler.ai',
  metadata: { department: 'engineering', title: 'Staff Engineer' },
});

// Create an organization-scoped AI agent owned by Alice
const agent = sg.createIdentity('ai_agent', 'doc-summarizer', 'org-1', {
  ownerId: alice.id,
  metadata: { model: 'gpt-4o' },
});

// Create a connector identity
const connector = sg.createIdentity('connector', 'slack-connector', 'org-1');

// List all users in org-1
const users = sg.identity.listByType('user', 'org-1');
console.log(users.length); // 1

// Suspend the agent
sg.setIdentities(agent.id, 'suspended');
console.log(sg.identity.get(agent.id)?.status); // 'suspended'

// Reactivate it
sg.setIdentities(agent.id, 'active');

// Delete the connector
sg.identity.delete(connector.id);
console.log(sg.identity.exists(connector.id)); // false

// Total identity count
console.log(sg.identity.count()); // 2 (alice + agent)
```

## 2. Authenticate with the mock provider

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();
const alice = sg.createIdentity('user', 'Alice', 'org-1');

// Authenticate
const auth = await sg.authenticate({
  identityId: alice.id,
  method: 'mock',
  token: 'test',
  metadata: {},
});
console.log(auth.authenticated); // true
console.log(auth.token);         // 'mock-token-...'
console.log(auth.expiresAt);     // ISO timestamp ~1h ahead

// Validate the issued token
const valid = await sg.validateToken(auth.token!);
console.log(valid.authenticated); // true

// Refresh the token (extends TTL)
const refreshed = await sg.auth.refreshToken(auth.token!);
console.log(refreshed.authenticated); // true

// Revoke the token via the mock provider
// (sg.auth.getProvider('mock') as MockAuthProvider).revokeToken(auth.token!);

// A failed authentication returns a result, not an exception
const bad = await sg.authenticate({
  identityId: 'no-such-id', method: 'mock', token: 'x', metadata: {},
});
console.log(bad.authenticated); // false
console.log(bad.error);         // 'Identity not found'

// Authenticating also emits telemetry and writes an audit 'login' event
console.log(sg.getTelemetryEventsByType('authentication.success').length); // >= 1
console.log(sg.queryAuditLog({ action: 'login' }).length);                // >= 1
```

## 3. RBAC authorization check

```typescript
import { SecurityGovernance, hasRolePermission } from '@compilerai/security-governance';

const sg = new SecurityGovernance();
const bob = sg.createIdentity('user', 'Bob', 'org-1');

// Employee can read the knowledge graph
const canRead = sg.authorize({
  identityId: bob.id, resource: 'knowledge_graph', action: 'read',
  organizationId: 'org-1', roles: ['employee'],
});
console.log(canRead.allowed);    // true
console.log(canRead.matchedBy);  // 'rbac'

// Viewer cannot write
const canWrite = sg.authorize({
  identityId: bob.id, resource: 'knowledge_graph', action: 'write',
  organizationId: 'org-1', roles: ['viewer'],
});
console.log(canWrite.allowed);   // false
console.log(canWrite.matchedBy); // 'denied'

// Direct permission helper — no request object needed
console.log(hasRolePermission('auditor', 'audit', 'read'));   // true
console.log(hasRolePermission('auditor', 'audit', 'write'));  // false
console.log(hasRolePermission('owner', 'secrets', 'admin'));  // true
console.log(hasRolePermission('ai_agent', 'multi_agent', 'execute')); // true
```

## 4. ABAC with time restrictions

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();
const bob = sg.createIdentity('user', 'Bob', 'org-1');

// During business hours — employee write is allowed (RBAC grants manager? no — employee has no write on KG)
// Use a role that has write: 'manager'
const mgr = sg.createIdentity('user', 'Carol', 'org-1');

const businessHours = sg.authorize({
  identityId: mgr.id, resource: 'knowledge_graph', action: 'write',
  organizationId: 'org-1', roles: ['manager'],
  abacContext: sg.createABACContext('org-1', { timeOfDay: '14:00', dayOfWeek: 'Tuesday' }),
});
console.log(businessHours.allowed);   // true (RBAC grants write; ABAC passes)

// After hours — employee-class write is denied
const afterHours = sg.authorize({
  identityId: mgr.id, resource: 'knowledge_graph', action: 'write',
  organizationId: 'org-1', roles: ['manager'],
  abacContext: sg.createABACContext('org-1', { timeOfDay: '22:00' }),
});
console.log(afterHours.allowed);      // false
console.log(afterHours.matchedBy);    // 'abac'
console.log(afterHours.conditions);   // ['time_restriction']

// Owner bypasses the time restriction
const ownerWrite = sg.authorize({
  identityId: mgr.id, resource: 'knowledge_graph', action: 'write',
  organizationId: 'org-1', roles: ['owner'],
  abacContext: sg.createABACContext('org-1', { timeOfDay: '23:00' }),
});
console.log(ownerWrite.allowed);      // true
```

## 5. ABAC with classification restrictions

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

// Restricted classification requires owner or admin
const employeeRestricted = sg.authorize({
  identityId: 'u1', resource: 'secrets', action: 'read',
  organizationId: 'org-1', roles: ['employee'],
  abacContext: sg.createABACContext('org-1', { resourceClassification: 'restricted' }),
});
console.log(employeeRestricted.allowed);   // false
console.log(employeeRestricted.matchedBy); // 'abac'

const ownerRestricted = sg.authorize({
  identityId: 'u1', resource: 'secrets', action: 'read',
  organizationId: 'org-1', roles: ['owner'],
  abacContext: sg.createABACContext('org-1', { resourceClassification: 'restricted' }),
});
console.log(ownerRestricted.allowed);      // true

// Confidential resource is not accessible to a sole viewer
const viewerConfidential = sg.authorize({
  identityId: 'u1', resource: 'enterprise_rag', action: 'read',
  organizationId: 'org-1', roles: ['viewer'],
  abacContext: sg.createABACContext('org-1', { resourceClassification: 'confidential' }),
});
console.log(viewerConfidential.allowed);   // false

// Organization mismatch always denies
const crossOrg = sg.authorize({
  identityId: 'u1', resource: 'knowledge_graph', action: 'read',
  organizationId: 'org-1', roles: ['employee'],
  abacContext: sg.createABACContext('org-2'),
});
console.log(crossOrg.allowed);             // false
```

## 6. Policy engine: deny rule

```typescript
import { SecurityGovernance, createPolicyRule } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

// Deny deletion of secrets regardless of role
sg.addPolicyRule(createPolicyRule('deny-secret-delete', 'No Secret Deletion', 'deny', {
  priority: 100,
  description: 'Secrets may never be deleted via policy',
  resources: ['secrets'],
  actions: ['delete'],
}));

// Even an owner is denied
const decision = sg.authorize({
  identityId: 'u1', resource: 'secrets', action: 'delete',
  organizationId: 'org-1', roles: ['owner'],
});
console.log(decision.allowed);    // false
console.log(decision.matchedBy);  // 'policy'
console.log(decision.conditions); // ['No Secret Deletion']

// Inspect via evaluatePolicy for the full trace
const result = sg.evaluatePolicy({
  identityId: 'u1', resource: 'secrets', action: 'delete',
  organizationId: 'org-1', roles: ['owner'],
});
console.log(result.decision);            // 'deny'
console.log(result.trace[0].matched);    // true
console.log(result.trace[0].ruleName);   // 'No Secret Deletion'
```

## 7. Policy engine: require_approval

```typescript
import { SecurityGovernance, createPolicyRule } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

// Writing to restricted knowledge resources requires approval
sg.addPolicyRule(createPolicyRule('approval-restricted', 'Approval for Restricted', 'require_approval', {
  priority: 50,
  resources: ['knowledge_graph', 'enterprise_rag'],
  actions: ['write'],
  condition: { classification: ['restricted'] },
}));

const decision = sg.authorize({
  identityId: 'u1', resource: 'knowledge_graph', action: 'write',
  organizationId: 'org-1', roles: ['manager'],
  abacContext: sg.createABACContext('org-1', { resourceClassification: 'restricted' }),
});
console.log(decision.allowed);      // false (approval required)
console.log(decision.matchedBy);    // 'policy'
console.log(decision.conditions);   // ['requires_approval', 'Approval for Restricted']

// The policy result carries the raw effect
const result = sg.evaluatePolicy({
  identityId: 'u1', resource: 'knowledge_graph', action: 'write',
  organizationId: 'org-1', roles: ['manager'],
  abacContext: sg.createABACContext('org-1', { resourceClassification: 'restricted' }),
});
console.log(result.decision);       // 'require_approval'
```

## 8. Store and retrieve secrets

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

// Store an API key (encrypted at rest)
const record = sg.storeSecret('stripe-key', 'sk_live_12345', 'api_key', 'org-1');
console.log(record.id);                          // 'secret-1'
console.log(record.encryptedValue);              // 'iv:ciphertext' (not the plaintext)
console.log(record.encryptedValue.includes('sk_live_12345')); // false

// Retrieve and decrypt
const value = sg.getSecret(record.id);
console.log(value); // 'sk_live_12345'

// Retrieve by name via the secrets manager
const byName = sg.secrets.getSecretByName('stripe-key', 'org-1');
console.log(byName); // 'sk_live_12345'

// All 4 secret types
sg.storeSecret('oauth', 'token-abc', 'oauth_token', 'org-1');
sg.storeSecret('cert', 'cert-data', 'certificate', 'org-1');
sg.storeSecret('internal', 'internal-val', 'internal', 'org-1');
console.log(sg.listSecrets('org-1').length); // 4

// Rotate a secret
const rotated = sg.rotateSecret(record.id, 'sk_live_99999');
console.log(sg.getSecret(record.id)); // 'sk_live_99999'
console.log(rotated?.lastRotatedAt);  // ISO timestamp

// Delete a secret
console.log(sg.deleteSecret(record.id)); // true
console.log(sg.getSecret(record.id));    // undefined

// Storing and retrieving both emit 'secret_access' audit events
console.log(sg.queryAuditLog({ action: 'secret_access' }).length); // >= 2
```

## 9. Encrypt and decrypt data

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

const plaintext = 'sensitive data';
const encrypted = sg.encrypt(plaintext);
console.log(encrypted.algorithm); // 'aes-256-cbc'
console.log(encrypted.keyId);     // 'default'
console.log(encrypted.ciphertext !== plaintext); // true

// Decrypt back to the original
const decrypted = sg.decrypt(encrypted);
console.log(decrypted); // 'sensitive data'

// Each encryption uses a fresh IV, so ciphertexts differ
const e2 = sg.encrypt(plaintext);
console.log(e2.ciphertext !== encrypted.ciphertext); // true

// Hashing is deterministic (SHA-256 by default)
const h1 = sg.hash('test data');
const h2 = sg.hash('test data');
console.log(h1 === h2);          // true
console.log(h1 === sg.hash('other')); // false
console.log(h1.length);          // 64 (hex digest)
```

## 10. Sign and verify data

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

const data = 'important document';
const signature = sg.sign(data);
console.log(signature.algorithm); // 'HMAC-SHA256'
console.log(signature.keyId);     // 'default'
console.log(signature.data);      // hex HMAC digest

// Verify the authentic document
console.log(sg.verify(data, signature)); // true

// Tampered data fails verification
console.log(sg.verify('tampered document', signature)); // false

// You can also sign/verify with a specific key id
const enc = sg.encrypt('payload', 'default');
const sig = sg.sign('payload', 'default');
console.log(sg.verify('payload', sig, 'default')); // true
```

## 11. Write and query audit logs

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();
const alice = sg.createIdentity('user', 'Alice', 'org-1');

// Write an explicit audit event
const event = sg.writeAuditLog({
  actor: alice.id,
  actorType: 'user',
  resource: 'knowledge_graph',
  action: 'kg_access',
  result: 'success',
  organizationId: 'org-1',
  details: { query: 'MATCH (n) RETURN n' },
});
console.log(event.id);        // 'audit-1'
console.log(event.timestamp); // ISO timestamp

// A denied authorization auto-writes an 'auth_denied' event
sg.authorize({
  identityId: alice.id, resource: 'secrets', action: 'write',
  organizationId: 'org-1', roles: ['viewer'],
});

// Query denied events
const denied = sg.queryAuditLog({ action: 'auth_denied', organizationId: 'org-1' });
console.log(denied.length);     // 1
console.log(denied[0].result);  // 'denied'

// Count events
console.log(sg.audit.count());                  // total events
console.log(sg.audit.count({ actor: alice.id })); // events by actor

// Time-range query with pagination
const recent = sg.queryAuditLog({
  organizationId: 'org-1',
  startTime: new Date(Date.now() - 60_000).toISOString(),
  limit: 50,
});

// Export all events (no pagination limit) — useful for serialization
const all = sg.audit.export({ organizationId: 'org-1' });
console.log(all.length); // 2
```

## 12. Compliance assessment

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

// List available frameworks
console.log(sg.getAllFrameworks()); // ['iso27001', 'soc2', 'gdpr', 'nis2']

// Before any assessment, everything is 'not_assessed' with score 0
const initial = sg.assessCompliance('iso27001');
console.log(initial.score);          // 0
console.log(initial.overallStatus);  // 'not_assessed'
console.log(initial.controls.length); // 5

// Mark ISO 27001 controls as compliant with evidence
sg.setComplianceControlStatus('iso-a5', 'compliant', ['infosec-policy.pdf']);
sg.setComplianceControlStatus('iso-a8', 'compliant', ['asset-inventory.csv']);
sg.setComplianceControlStatus('iso-a9', 'compliant', ['access-control-matrix.xlsx']);
sg.setComplianceControlStatus('iso-a10', 'partial', ['crypto-inventory.json']);
// iso-a6 left as not_assessed

const assessment = sg.assessCompliance('iso27001');
console.log(assessment.score);         // 60 (3 of 5 compliant)
console.log(assessment.overallStatus); // 'partial'

// Register a custom control
sg.compliance.registerControl({
  id: 'iso-a12',
  framework: 'iso27001',
  controlCode: 'A.12',
  title: 'Operations Security',
  description: 'Operational procedures and controls',
  status: 'not_assessed',
});
console.log(sg.getComplianceControls('iso27001').length); // 6

// Assess GDPR
const gdpr = sg.assessCompliance('gdpr');
console.log(gdpr.controls.length); // 5
console.log(gdpr.overallStatus);   // 'not_assessed'
```

## 13. Key rotation

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

// Encrypt data with the default key
const encrypted = sg.encrypt('legacy secret', 'default');
console.log(encrypted.keyId); // 'default'

// Rotate the key — generates a new key and sets it as current
const newKeyId = sg.rotateKey('default');
console.log(newKeyId);                              // 'default-<timestamp>'
console.log(newKeyId !== 'default');                // true
console.log(sg.encryption.getKeyIds().length);      // >= 2

// Data encrypted with the OLD key still decrypts (keyId is embedded in EncryptedData)
const decrypted = sg.decrypt(encrypted);
console.log(decrypted); // 'legacy secret'

// New encryptions use the rotated (current) key
const newEnc = sg.encrypt('new secret');
console.log(newEnc.keyId); // newKeyId

// Import a custom 32-byte key
sg.encryption.importKey('kms-key', Buffer.alloc(32, 0x42));
const customEnc = sg.encrypt('with custom key', 'kms-key');
console.log(sg.decrypt(customEnc)); // 'with custom key'
```

## 14. Full security workflow

This example exercises the end-to-end workflow: create an identity, authenticate,
authorize with ABAC and policy, store a secret, encrypt a payload, write an audit log,
assess compliance, and inspect telemetry.

```typescript
import { SecurityGovernance, createPolicyRule } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

// 1. Create an identity
const alice = sg.createIdentity('user', 'Alice', 'org-1', {
  email: 'alice@compiler.ai',
  metadata: { department: 'security' },
});

// 2. Register a governance policy: require approval for restricted KG writes
sg.addPolicyRule(createPolicyRule('approval-kg', 'Approval for Restricted KG Writes', 'require_approval', {
  priority: 80,
  resources: ['knowledge_graph'],
  actions: ['write'],
  condition: { classification: ['restricted'] },
}));

// 3. Authenticate
const auth = await sg.authenticate({
  identityId: alice.id, method: 'mock', token: 'pw', metadata: {},
});
console.log(auth.authenticated); // true

// 4. Authorize a normal read (RBAC allows employee read)
const readDecision = sg.authorize({
  identityId: alice.id, resource: 'knowledge_graph', action: 'read',
  organizationId: 'org-1', roles: ['employee'],
});
console.log(readDecision.allowed);   // true

// 5. Attempt a restricted write — policy requires approval
const writeDecision = sg.authorize({
  identityId: alice.id, resource: 'knowledge_graph', action: 'write',
  organizationId: 'org-1', roles: ['manager'],
  abacContext: sg.createABACContext('org-1', { resourceClassification: 'restricted' }),
});
console.log(writeDecision.allowed);    // false
console.log(writeDecision.conditions?.includes('requires_approval')); // true

// 6. Store and retrieve an API key secret
const secret = sg.storeSecret('external-api', 'sk_abc123', 'api_key', 'org-1');
console.log(sg.getSecret(secret.id)); // 'sk_abc123'

// 7. Encrypt a sensitive payload
const enc = sg.encrypt('PII payload: 123-45-6789');
console.log(sg.decrypt(enc)); // 'PII payload: 123-45-6789'

// 8. Write an audit log entry for the access attempt
sg.writeAuditLog({
  actor: alice.id, actorType: 'user', resource: 'knowledge_graph',
  action: 'kg_access', result: 'success', organizationId: 'org-1',
  details: { decision: readDecision.reason },
});

// 9. Assess compliance posture for ISO 27001
sg.setComplianceControlStatus('iso-a9', 'compliant', ['access-control-policy.pdf']);
const isoAssessment = sg.assessCompliance('iso27001');
console.log(isoAssessment.score); // 20 (1 of 5)

// 10. Inspect telemetry — every operation above emitted events
const events = sg.getTelemetryEvents();
console.log(events.length); // >= 6
console.log(sg.getTelemetryEventsByType('authentication.success').length); // 1
console.log(sg.getTelemetryEventsByType('authorization.granted').length);  // 1
console.log(sg.getTelemetryEventsByType('authorization.denied').length);   // 1
console.log(sg.getTelemetryEventsByType('secret.accessed').length);        // 1
console.log(sg.getTelemetryEventsByType('encryption.completed').length);   // 1
console.log(sg.getTelemetryEventsByType('audit.written').length);          // 1

// 11. Query the audit trail for Alice's activity
const aliceAudits = sg.queryAuditLog({ actor: alice.id, organizationId: 'org-1' });
console.log(aliceAudits.length); // >= 3 (login, auth_denied, kg_access)
```
