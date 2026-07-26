# Permissions

The permissions module (`src/permissions/`) provides `PermissionEngine`, which validates that a skill's required permissions are satisfied before installation and supports runtime access checks.

## Permission Resources (10)

Skills declare access to protected resources. The marketplace recognizes 10 resources:

| Resource | Description |
|----------|-------------|
| `gmail` | Gmail email access |
| `google_drive` | Google Drive file access |
| `github` | GitHub repository access |
| `knowledge_graph` | Knowledge Graph entity access |
| `enterprise_rag` | Enterprise RAG indexing access |
| `multi_agent` | Multi-agent orchestration access |
| `filesystem` | Local filesystem access |
| `network` | Network and HTTP access |
| `environment` | Environment variable access |
| `secrets` | Secrets and credential access |

## Access Levels (4)

Each permission grants one or more access levels:

| Access | Meaning |
|--------|---------|
| `read` | Read data from the resource |
| `write` | Create, modify, or delete data in the resource |
| `execute` | Execute operations or commands on the resource |
| `delete` | Remove data or resources |

A single `SkillPermission` can request multiple access levels for the same resource (e.g., `['read', 'write']`).

## SkillPermission Structure

```typescript
interface SkillPermission {
  resource: PermissionResource;
  access: PermissionAccess[];
  reason: string;
}
```

The `reason` field is a human-readable justification shown to users during the install consent flow.

## Validation Flow

```
installSkill(skillId, grantedPermissions)
    │
    ▼
PermissionEngine.validate(manifest, granted)
    │
    ├─ getMissingPermissions(manifest, granted) → []
    │
    ├─ missing.length === 0 → valid: true  → install proceeds
    │
    └─ missing.length > 0   → valid: false → install fails
                                 → 'permission.denied' telemetry emitted
                                 → errors returned with missing permissions
```

The engine checks that **every** access level declared in each manifest permission is covered by at least one granted permission for the same resource. A single missing access level makes the entire permission invalid.

## PermissionEngine Methods

### `validate(manifest, granted): PermissionValidationResult`

Returns `{ valid, missing, granted }`. `valid` is `true` only when `missing` is empty.

### `checkAccess(resource, access, granted): boolean`

Returns `true` if any granted permission covers the requested resource and access level. Used for runtime access checks.

### `getRequiredPermissions(manifest): SkillPermission[]`

Returns a copy of the manifest's declared permissions.

### `getMissingPermissions(manifest, granted): SkillPermission[]`

Returns the subset of manifest permissions that are not fully covered by the granted set.

### `summarizePermissions(permissions): string`

Returns a human-readable summary (e.g., `"github: [read]; filesystem: [read, write]"`).

## Missing Permission Detection

The `getMissingPermissions` method iterates over each required permission and checks that every declared access level exists in the granted set:

```typescript
for (const req of manifest.permissions) {
  const hasAll = req.access.every((access) =>
    granted.some((g) => g.resource === req.resource && g.access.includes(access)),
  );
  if (!hasAll) {
    missing.push(req);
  }
}
```

If a skill requires `github: [read, write]` but the user grants only `github: [read]`, the entire `github` permission is reported as missing because `write` is not covered.

## Code Example

```typescript
import { PermissionEngine, createSkill, createPermission } from '@compilerai/skills-marketplace';

const engine = new PermissionEngine();

const { manifest } = createSkill()
  .id('repo-cleaner')
  .name('Repo Cleaner')
  .description('Cleans up stale branches')
  .version('1.0.0')
  .author('Jane')
  .organization('my-org')
  .permissions([
    createPermission('github', ['read', 'write'], 'Read and delete branches'),
  ])
  .execute(async (ctx) => ({ /* ... */ }))
  .build();

// User grants only read access
const partial = [createPermission('github', ['read'], 'Read access')];
const result = engine.validate(manifest, partial);
console.log(result.valid);  // false
console.log(result.missing); // [{ resource: 'github', access: ['read', 'write'], ... }]

// User grants full access
const full = [createPermission('github', ['read', 'write'], 'Full access')];
const valid = engine.validate(manifest, full);
console.log(valid.valid);   // true
console.log(valid.missing); // []

// Runtime access check
engine.checkAccess('github', 'write', full); // true
engine.checkAccess('github', 'delete', full); // false
```
