# @compilerai/security-governance v1.0.0

> Enterprise Security, Identity & Governance layer for CompilerAI — authentication,
> authorization (RBAC + ABAC), policy enforcement, audit logging, secrets management,
> encryption, and compliance framework across all CompilerAI modules.

`@compilerai/security-governance` is a zero-dependency, TypeScript-first package that
provides a single, cohesive API surface for securing every CompilerAI module — the
Knowledge Graph, Enterprise RAG, Skills Marketplace, Multi-Agent orchestration,
Connectors, and Workflows. It exposes a `SecurityGovernance` facade that wires together
identity management, authentication providers, role-based and attribute-based access
control, a policy engine, secrets storage, encryption, audit logging, compliance
assessment, and telemetry.

## Key features

- **Identity management** — 5 identity types: `user`, `organization`, `ai_agent`,
  `connector`, `skill`; lifecycle states `active`, `suspended`, `deactivated`; per-org
  indexing and CRUD operations.
- **Authentication** — pluggable `IAuthProvider` interface supporting `oauth2`, `oidc`,
  `saml`, `api_key`, `service_account`, and a built-in `mock` provider for offline
  testing and local development; token validation and refresh.
- **RBAC** — 7 built-in roles: `owner`, `admin`, `manager`, `employee`, `auditor`,
  `viewer`, `ai_agent`; each role declares an explicit allow-list of resource/action
  permissions with a priority ordering.
- **ABAC** — context attributes for `organizationId`, `department`, `tags`,
  `timeOfDay`, `dayOfWeek`, `resourceClassification` (`public` / `internal` /
  `confidential` / `restricted`), `resourceTags`, and `resourceOwner`.
- **Policy engine** — 5 policy effects: `allow`, `deny`, `require_approval`,
  `restricted`, `read_only`; priority-sorted, first-match-wins evaluation with a
  per-rule evaluation trace; rule factories via `createPolicyRule`.
- **Secrets manager** — `InMemorySecretStore` and `SecretsManager` with 4 secret types:
  `api_key`, `oauth_token`, `certificate`, `internal`; values are encrypted at rest with
  a pluggable encrypt/decrypt pair; rotation support.
- **Encryption** — `EncryptionService` providing AES-256-CBC symmetric encryption,
  SHA-256 hashing, HMAC-SHA256 signing & verification, key rotation, and key import.
- **Audit log** — 12 audit actions (`login`, `logout`, `skill_install`, `agent_execute`,
  `kg_access`, `rag_query`, `permission_change`, `policy_change`, `auth_denied`,
  `secret_access`, `data_export`, `config_change`) with queryable filters and export.
- **Compliance framework** — 4 frameworks: ISO 27001, SOC 2, GDPR, NIS2; per-control
  status tracking, evidence capture, and assessment scoring.
- **Telemetry** — 8 event types covering authentication, authorization, policy,
  secret access, encryption, and audit observability.

## Quick start

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

// Create identity
const user = sg.createIdentity('user', 'Alice', 'org-1');

// Authenticate
const auth = await sg.authenticate({ identityId: user.id, method: 'mock', token: 'test', metadata: {} });

// Authorize
const decision = sg.authorize({
  identityId: user.id, resource: 'knowledge_graph', action: 'read',
  organizationId: 'org-1', roles: ['employee'],
});

// Encrypt & store secret
const enc = sg.encrypt('sensitive data');
const secret = sg.storeSecret('api-key', 'secret123', 'api_key', 'org-1');

// Audit
sg.writeAuditLog({ actor: user.id, actorType: 'user', resource: 'kg', action: 'kg_access', result: 'success', organizationId: 'org-1', details: {} });
```

## Modules

| # | Module | Path | Description |
|---|--------|------|-------------|
| 1 | API facade | `src/api/SecurityGovernance.ts` | `SecurityGovernance` class wiring all subsystems |
| 2 | Identity | `src/identity/IdentityManager.ts` | Identity CRUD, lifecycle, per-org indexing |
| 3 | Authentication | `src/authentication/AuthenticationManager.ts` | Provider registry + `MockAuthProvider` |
| 4 | Authorization | `src/authorization/AuthorizationEngine.ts` | RBAC + ABAC + policy integration |
| 5 | Policies | `src/policies/PolicyEngine.ts` | Priority rule engine with trace |
| 6 | Roles | `src/roles/RoleDefinitions.ts` | 7 role definitions + permission helpers |
| 7 | Secrets | `src/secrets/SecretsManager.ts` | `InMemorySecretStore` + `SecretsManager` |
| 8 | Encryption | `src/encryption/EncryptionService.ts` | AES-256-CBC, SHA-256, HMAC, key rotation |
| 9 | Audit | `src/audit/AuditLog.ts` | Append-only audit event log + queries |
| 10 | Compliance | `src/compliance/ComplianceManager.ts` | ISO 27001, SOC2, GDPR, NIS2 controls |
| 11 | Telemetry | `src/telemetry/TelemetryEngine.ts` | In-memory event capture |
| 12 | Models | `src/models.ts` | All domain types & interfaces |
| 13 | Barrel | `src/index.ts` | Public exports |

## Package stats

| Metric | Value |
|--------|-------|
| Source files | 14 |
| Test files | 9 |
| Tests | 107 |
| Line coverage | 97.40% |
| Dependencies | 0 (production) |
| Node engine | `>=18` |

## Documentation

| Document | Topic |
|----------|-------|
| [docs/architecture.md](docs/architecture.md) | Architecture, module layout, data flow |
| [docs/identity.md](docs/identity.md) | Identity types & lifecycle |
| [docs/authentication.md](docs/authentication.md) | Auth providers & token handling |
| [docs/authorization.md](docs/authorization.md) | RBAC + ABAC model |
| [docs/policies.md](docs/policies.md) | Policy engine & effects |
| [docs/compliance.md](docs/compliance.md) | Compliance frameworks & controls |
| [docs/audit.md](docs/audit.md) | Audit actions & querying |
| [docs/api.md](docs/api.md) | Public API reference |
| [docs/examples.md](docs/examples.md) | 14 worked examples |
| [VALIDATION_REPORT.md](VALIDATION_REPORT.md) | Build, lint, typecheck & test results |

## Installation

```bash
npm install @compilerai/security-governance
```

## License

Proprietary — © CompilerAI. All rights reserved.
