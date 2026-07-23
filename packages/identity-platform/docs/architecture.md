# Architecture

## Package Structure

```
packages/identity-platform/
├── src/
│   ├── auth/                    # AuthenticationService
│   ├── authorization/           # AuthorizationService
│   ├── organizations/           # OrganizationService + models
│   ├── users/                   # UserService + models
│   ├── roles/                   # RoleService + models
│   ├── permissions/             # PermissionService + models
│   ├── service-accounts/        # ServiceAccount models
│   ├── api-keys/                # ApiKeyService + models
│   ├── sessions/                # SessionService + models
│   ├── policies/                # PolicyEngine + models
│   ├── audit/                   # AuditService + models
│   ├── repositories/            # Repository interfaces + in-memory impl
│   ├── adapters/                # Security adapters (hashing, tokens, errors)
│   ├── types/                   # Shared types
│   ├── IdentityPlatform.ts      # Facade
│   └── index.ts                 # Public exports
├── tests/                       # 9 test files
├── examples/                    # Full-flow example
└── docs/                        # 8 documentation files
```

## Design Principles

### 1. Dependency Injection
All services receive repositories and primitives (`idGen`, `clock`) via constructor injection. No direct `Date.now()` or `crypto.randomUUID()` calls.

### 2. Interface Segregation
Repository interfaces defined in `RepositoryInterfaces.ts`. In-memory implementations in `InMemoryRepository.ts`. Swappable for Supabase-backed implementations.

### 3. Organization Isolation
Every entity (except Permission) is scoped by `organizationId`. Cross-tenant access throws `CrossTenantError`.

### 4. No Plaintext Secrets
Passwords hashed with PBKDF2. Tokens/API keys hashed with SHA-256. Only hashes stored; raw values returned to caller once.

### 5. Facade Pattern
`IdentityPlatform` wires all services with sensible defaults. Users can override any dependency.

## Service Dependencies

```
IdentityPlatform
├── AuthenticationService
│   ├── UserService
│   ├── SessionService
│   ├── ApiKeyService
│   ├── AuditService
│   └── AuthorizationService
├── AuthorizationService
│   ├── RoleService
│   └── PolicyEngine
├── OrganizationService
├── UserService
├── RoleService
├── PermissionService
├── ApiKeyService
├── SessionService
├── PolicyEngine
└── AuditService
```

## Data Flow

1. **Organization bootstrap** → creates org, seeds system roles, creates admin user
2. **User login** → validates credentials → creates session → builds auth context → records audit
3. **Permission check** → builds auth context from user roles → checks RBAC permissions → evaluates policies
4. **API key auth** → hashes raw key → looks up by hash → validates active → records audit
5. **Cross-tenant check** → compares context orgId vs target orgId → throws if mismatch (unless PlatformAdmin)
