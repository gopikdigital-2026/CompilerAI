# @compilerai/identity-platform

Enterprise multi-tenant Identity & Access Management (IAM) platform for CompilerAI.

## Overview

A decoupled, multi-tenant identity platform providing authentication, RBAC authorization, organization isolation, audit logging, API key management, session management, and policy-based access control. Integrates with other CompilerAI packages through public interfaces only — no circular dependencies.

## Installation

```bash
npm install @compilerai/identity-platform
```

## Quick Start

```typescript
import { IdentityPlatform } from '@compilerai/identity-platform';

const platform = new IdentityPlatform({
  idGenerator: () => crypto.randomUUID(),
  clock: () => new Date().toISOString(),
});

// Bootstrap an organization with an admin user
const { org, user, roles } = await platform.bootstrapOrganization({
  name: 'Acme Corp',
  slug: 'acme',
  plan: 'PRO',
  ownerEmail: 'admin@acme.com',
  ownerPassword: 'SecurePass123!',
  ownerDisplayName: 'Acme Admin',
});

// Login
const { session, rawToken, authContext } = await platform.authentication.login({
  email: 'admin@acme.com',
  password: 'SecurePass123!',
  organizationId: org.id,
});

// Check permissions
const canReadUsers = await platform.authorization.checkPermission(authContext, 'users:read');
```

## Core Services

| Service | Responsibility |
|---|---|
| `IdentityPlatform` | Facade wiring all services together |
| `AuthenticationService` | Login, logout, API key + session authentication |
| `AuthorizationService` | Permission checks, cross-tenant enforcement, privilege escalation prevention |
| `OrganizationService` | Organization CRUD, plan management |
| `UserService` | User CRUD, role assignment, login tracking |
| `RoleService` | Role CRUD, system role seeding, role inheritance |
| `PermissionService` | Permission CRUD, system permission seeding, PermissionSet |
| `ApiKeyService` | API key creation, authentication, revocation, rotation |
| `SessionService` | Session CRUD, token-based auth, revocation, cleanup |
| `PolicyEngine` | Policy CRUD, condition evaluation, allow/deny decisions |
| `AuditService` | Audit trail recording, querying by org/actor/action |

## RBAC System Roles

| Role | Permissions |
|---|---|
| `PlatformAdmin` | Wildcard (`*`) — full access across all orgs |
| `OrganizationAdmin` | Full user/role/apikey/session/audit management within org |
| `Developer` | Read access + API key creation |
| `Operator` | Read access + session management |
| `Auditor` | Read-only access to users, roles, apikeys, sessions, audit |
| `Viewer` | Read-only access to users, roles, audit, org |

Custom roles can be created per organization with specific permissions and role inheritance.

## Security

- **Password hashing**: PBKDF2 with SHA-512, 100K iterations, 32-byte salt
- **Token storage**: SHA-256 hashed at rest; raw token returned only once
- **API key rotation**: Revokes old key and creates new one atomically
- **Session security**: Token-based, hash-stored, revocable, with expiry
- **Audit sanitization**: Sensitive fields (passwords, keys, tokens) redacted in audit logs
- **Privilege escalation protection**: Only PlatformAdmin can assign PlatformAdmin
- **Multi-tenant isolation**: All data scoped by `organizationId`

See [docs/security.md](docs/security.md) for details.

## Documentation

- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [Authorization](docs/authorization.md)
- [RBAC](docs/rbac.md)
- [Multi-tenancy](docs/multi-tenancy.md)
- [Audit](docs/audit.md)
- [Security](docs/security.md)
- [API Gaps](docs/api-gaps.md)

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
