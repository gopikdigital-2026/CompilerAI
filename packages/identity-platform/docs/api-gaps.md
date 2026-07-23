# API Gaps — Pending Integrations

This document tracks integrations between the Identity Platform and other CompilerAI platform components that are not yet implemented.

## 1. Supabase Persistence

**Status**: Not implemented

The platform uses `InMemoryIdentityRepository` by default. A Supabase-backed repository implementation should persist all entities (organizations, users, roles, permissions, API keys, sessions, policies, audit entries) across restarts.

**Required tables**:
- `identity_organizations`
- `identity_users`
- `identity_roles`
- `identity_permissions`
- `identity_api_keys`
- `identity_sessions`
- `identity_service_accounts`
- `identity_policies`
- `identity_audit_entries`

**RLS policies**: All tables must enforce `organizationId` isolation via `auth.uid()` checks.

**Integration point**: Implement `IdentityRepository` interface with Supabase client; inject into `IdentityPlatformDeps.repository`.

## 2. Platform API Endpoints

**Status**: Not implemented

Suggested routes:

| Method | Path | Description |
|---|---|---|
| POST | `/v1/identity/organizations` | Create organization |
| GET | `/v1/identity/organizations/:id` | Get organization |
| POST | `/v1/identity/users` | Create user |
| GET | `/v1/identity/users` | List users (org-scoped) |
| POST | `/v1/identity/auth/login` | Login |
| POST | `/v1/identity/auth/logout` | Logout |
| POST | `/v1/identity/api-keys` | Create API key |
| DELETE | `/v1/identity/api-keys/:id` | Revoke API key |
| POST | `/v1/identity/api-keys/:id/rotate` | Rotate API key |
| GET | `/v1/identity/audit` | Query audit log |
| POST | `/v1/identity/policies` | Create policy |
| GET | `/v1/identity/policies` | List policies |

**Integration point**: Add route registrations in `src/platform/api/routes/RouteRegistration.ts`.

## 3. SDK Resource

**Status**: Not implemented

The TypeScript SDK should add an `IdentityResource` wrapping the Platform API endpoints.

**Integration point**: Add `IdentityResource` in `packages/sdk-typescript/src/resources/identity.ts`.

## 4. CLI Commands

**Status**: Not implemented

```
compiler identity org create <name> <slug>
compiler identity org list
compiler identity user create <email> <org-id>
compiler identity user list <org-id>
compiler identity apikey create <name> <org-id>
compiler identity apikey revoke <key-id>
compiler identity apikey rotate <key-id>
compiler identity audit list <org-id>
compiler identity policy create <org-id> <policy.json>
```

**Integration point**: Add command files in `packages/cli/src/commands/identity.ts`.

## 5. Dashboard UI

**Status**: Not implemented

The dashboard should add Identity Management pages:
- Organization list and detail
- User management (create, edit, assign roles)
- API key management (create, revoke, rotate)
- Audit log viewer
- Policy editor

**Integration point**: Add feature pages in `packages/dashboard/src/features/identity/`.

## 6. Agent Runtime Integration

**Status**: Interface ready

The Agent Runtime can consume the Identity Platform's `AuthContext` and `AuthorizationService` for agent permission checks. The runtime integration test demonstrates the interface compatibility.

**Integration point**: Inject `AuthorizationService` into the Agent Runtime's `AgentPolicyEngine`.

## 7. OAuth2/OIDC

**Status**: Interfaces prepared, not implemented

The `AuthMethod` type includes `'OAUTH2'` as a placeholder. Future implementation would add:
- OAuth2 provider configuration
- Authorization code flow
- Token exchange
- User provisioning from provider claims

## 8. MFA (Multi-Factor Authentication)

**Status**: Model field exists, not enforced

The `User.mfaEnabled` field is defined. Future implementation would add:
- TOTP secret enrollment
- MFA challenge during login
- Recovery codes
