# Identity Layer Architecture

## Overview

The identity layer (`src/platform/identity/`) provides authentication, authorization, organization management, RBAC, API keys, and session management for the CompilerAI SaaS platform. It follows DDD and SOLID principles, fully decoupled from the domain layer.

## Architecture

```
┌────────────────────────────────────────────────────┐
│              Platform API / Runtime                │
├────────────────────────────────────────────────────┤
│              Identity Layer                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │   Auth   │ │   Authz  │ │   Orgs   │          │
│  │ (JWT/API)│ │ (RBAC)   │ │          │          │
│  ├──────────┤ ├──────────┤ ├──────────┤          │
│  │  Users   │ │  Roles   │ │ API Keys │          │
│  ├──────────┤ ├──────────┤ ├──────────┤          │
│  │ Sessions │ │ Policies │ │   DTOs   │          │
│  └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────────────────────────────────┐         │
│  │       Repositories (interfaces)      │         │
│  │  ┌──────────────────────────────┐    │         │
│  │  │   In-Memory / Postgres impls │    │         │
│  │  └──────────────────────────────┘    │         │
│  └──────────────────────────────────────┘         │
│  ┌──────────────────────────────────────┐         │
│  │       Middleware                      │         │
│  │  Auth | Authz | OrgCtx | Perm | Audit│         │
│  └──────────────────────────────────────┘         │
├────────────────────────────────────────────────────┤
│          Infrastructure Layer                      │
│    (Audit Log, Cache, Database, Secrets)           │
└────────────────────────────────────────────────────┘
```

## Key Principles

1. **Interface-driven** — All repositories and auth providers are interfaces. In-memory implementations for testing; Postgres for production.
2. **Domain decoupled** — Domain code never touches JWT, API keys, or passwords directly.
3. **Multitenant** — Every resource is scoped by `organizationId`. Cross-org access is blocked by default.
4. **No secrets logged** — Passwords, tokens, and API keys are never written to logs.
5. **RBAC + custom roles** — 6 system roles + org-scoped custom roles with 18 permissions.

## Module Index

| Module | Path | Purpose |
|--------|------|---------|
| Errors | `errors/IdentityErrors.ts` | 19 typed error classes |
| Permissions | `permissions/Permissions.ts` | 18-permission catalog + `PermissionSet` |
| Roles | `roles/Roles.ts` | 6 system roles + RBAC helpers |
| Organizations | `organizations/OrganizationModels.ts` | Org domain models, settings, limits |
| Users | `users/UserModels.ts` | User profiles, invitations, status |
| API Keys | `api-keys/ApiKeyModels.ts` | API key domain + scope validation |
| Sessions | `sessions/SessionModels.ts` | Session lifecycle models |
| Auth | `auth/` | JWT, API key, composite providers, password hasher |
| Authorization | `authorization/` | `AuthorizationService`, `PrivilegeGuard`, policy evaluator |
| Repositories | `repositories/` | 8 repository interfaces + in-memory implementations |
| Services | `services/` | Organization, User, ApiKey, Session, RolePermission services |
| Middleware | `middleware/IdentityMiddleware.ts` | 5 middleware components |
| DTOs | `dto/IdentityDtos.ts` | Request/response DTOs |
| Policies | `policies/IdentityPolicies.ts` | Organization, privilege escalation, suspension policies |
