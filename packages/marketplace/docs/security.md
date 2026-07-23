# Security Model

## Core Principle

**No code execution during installation.** The marketplace only validates manifests, verifies signatures, checks permissions, and records metadata. Tool code is never loaded, imported, or executed by the marketplace itself.

## Security Layers

### 1. Manifest Validation

Every manifest is structurally validated before any other check runs. This prevents malformed or incomplete manifests from reaching downstream checks.

- All 14 required fields must be present and correctly typed
- `id` must match `^[a-z0-9][a-z0-9-]*$`
- `version` must be valid semver
- `checksum` must be a 64-character hex string
- `category`, `permissions`, and `runtimeCompatibility` must use only known values

### 2. Signature Verification

After structural validation, the signature is verified:

- `signature` must start with `sig_` + first 16 chars of `checksum` — this binds the signature to the checksum, preventing tampering
- `verified` must be `true` — only marketplace-verified tools can be installed
- An empty or mismatched signature blocks installation

### 3. Permission Analysis

Permissions are classified by risk level and checked against a blocklist:

**Blocked by default** (cannot be installed without policy changes):
- `execute:shell` — arbitrary command execution
- `env:write` — environment variable manipulation
- `org:admin` — organization-level admin access

**Dangerous but installable with explicit override** (`allowDangerousPermissions: true`):
- `execute:shell` (if not in blocklist)
- `network:external` — external data egress
- `env:read` — secret exposure risk
- `file:write` — filesystem modification

Risk levels: `low` → `medium` → `high` → `critical`

The installer rejects tools with blocked permissions entirely. Dangerous permissions require the `allowDangerousPermissions` flag in install options.

### 4. Runtime Compatibility

Tools must declare at least one compatible runtime. The installer checks that:
- The target runtime is in the tool's `runtimeCompatibility` list
- All dependencies also support the target runtime
- Installed dependency versions satisfy the declared version range

### 5. Organization Isolation

All installation state is keyed by `organizationId`:
- `getInstalledTools(orgId)` returns only that org's tools
- `uninstall(toolId, { organizationId })` only affects that org
- Audit logs are scoped per organization
- One org cannot see or modify another org's installations

### 6. Dependency Safety

- **Install**: Dependencies must be registered and version-compatible
- **Uninstall**: Tools with dependents cannot be uninstalled — dependents must be removed first
- This prevents broken dependency chains in production

### 7. Audit Trail

Every action is recorded:

```typescript
interface ToolInstallationRecord {
  action: 'install' | 'update' | 'uninstall' | 'rollback';
  previousVersion: string | null;
  newVersion: string | null;
  performedBy: string;
  timestamp: string;
  success: boolean;
  reason: string;  // Error message on failure
}
```

Failed installations are also audited, including the reason for failure. This provides a complete forensic trail.

## Threat Model

| Threat | Mitigation |
|---|---|
| Malicious tool code execution | No code is executed during install — only metadata is validated |
| Tampered manifest | Signature must match checksum; both are verified |
| Unverified tool | `verified: false` blocks installation at signature check |
| Privilege escalation | Dangerous permissions blocked by default; admin perms always blocked |
| Cross-org data access | All state keyed by `organizationId` |
| Dependency confusion | Dependencies must exist in registry with compatible versions |
| Silent uninstall of dependency | Dependent tools block uninstall |
| Missing audit trail | All actions (including failures) are recorded |

## Customizing the Blocklist

The `ToolPermissionAnalyzer` accepts a custom blocked permissions list:

```typescript
const analyzer = new ToolPermissionAnalyzer([
  'execute:shell',
  'env:write',
  'org:admin',
  'network:external',  // additional block
]);
```

The `ToolInstaller` uses the default blocklist. To customize, inject a custom `ToolPermissionAnalyzer` or use the services directly instead of `MarketplaceService`.
