# Public API Reference

The `SkillsMarketplace` class (`src/api/`) is the main entry point. It instantiates all subsystems and exposes 8 public methods that cover the full skill lifecycle: registration, installation, execution, management, and discovery.

## SkillsMarketplace Class

```typescript
class SkillsMarketplace implements ISkillsMarketplace {
  readonly registry: SkillRegistry;
  readonly permissions: PermissionEngine;
  readonly sandbox: SkillSandbox;
  readonly installer: SkillInstaller;
  readonly lifecycle: LifecycleManager;
  readonly telemetry: ITelemetryEngine;
  readonly marketplace: Marketplace;

  constructor(); // Wires all subsystems together
}
```

All subsystems are exposed as public readonly properties, allowing direct access to advanced operations (e.g., `mp.lifecycle.getEventsByType('install')`) when the facade methods are insufficient.

## Public API Methods (8)

### `registerSkill(manifest, handler): void`

Registers a skill manifest and its handler. The manifest is stored in the registry; the handler is stored in an internal map keyed by skill ID. Re-registering the same ID updates the manifest while preserving registry metadata.

```typescript
mp.registerSkill(manifest, handler);
```

### `installSkill(skillId, grantedPermissions?): InstallResult`

Installs a skill with the given permissions. Validates permissions via the `PermissionEngine`, auto-installs required dependencies, updates the registry status to `installed`, and records lifecycle + telemetry events.

Returns `InstallResult`:
```typescript
{ skillId, success, installedVersion, dependenciesInstalled, errors }
```

```typescript
const result = mp.installSkill('github-repo-analyzer', manifest.permissions);
console.log(result.success); // true
```

### `uninstallSkill(skillId): UninstallResult`

Uninstalls a skill. Blocks removal if other installed skills depend on it. Cleans up orphaned required dependencies. Records `uninstall` lifecycle and `skill.disabled` telemetry events.

Returns `UninstallResult`:
```typescript
{ skillId, success, dependenciesRemoved, errors }
```

```typescript
const result = mp.uninstallSkill('github-repo-analyzer');
console.log(result.success); // true
```

### `enableSkill(skillId): boolean`

Enables an installed skill. Records `activate` lifecycle and `skill.enabled` telemetry events. Returns `false` if the skill is not found or not installed.

```typescript
const ok = mp.enableSkill('github-repo-analyzer');
console.log(ok); // true
```

### `disableSkill(skillId): boolean`

Disables an installed skill. Records `deactivate` lifecycle and `skill.disabled` telemetry events. Returns `false` if the skill is not found or not installed.

```typescript
const ok = mp.disableSkill('github-repo-analyzer');
console.log(ok); // true
```

### `executeSkill(skillId, command, parameters, organizationId, userId): Promise<SkillExecutionResult>`

Executes a skill command in the sandbox. Validates that the skill is installed, the command exists, and all required parameters are present. Resolves the sandbox policy (per-skill or default), runs the handler with timeout enforcement, and emits `skill.executed` telemetry.

Returns `SkillExecutionResult`:
```typescript
{ invocationId, skillId, command, success, output, error?, durationMs, startedAt, completedAt, telemetry }
```

```typescript
const result = await mp.executeSkill(
  'github-repo-analyzer',
  'analyze',
  { repository: 'owner/repo' },
  'org-1',
  'user-1',
);
console.log(result.success); // true
console.log(result.output);  // { repository, metrics, recommendations, ... }
```

### `listSkills(filter?): MarketplaceEntry[]`

Lists skills in the marketplace, optionally filtered by a `MarketplaceQuery`. Delegates to `Marketplace.search()`. Each entry includes compatibility status and install/enabled flags.

```typescript
const entries = mp.listSkills({ category: 'development', limit: 10 });
for (const entry of entries) {
  console.log(entry.record.manifest.name, entry.compatible, entry.isInstalled);
}
```

### `updateSkill(skillId, targetVersion?): UpdateResult`

Updates a skill to a target version from its version history. If `targetVersion` is omitted, updates to the latest version. Rejects deprecated versions and same-version updates. Records `update` lifecycle and `skill.updated` telemetry events.

Returns `UpdateResult`:
```typescript
{ skillId, success, previousVersion, newVersion, errors }
```

```typescript
const result = mp.updateSkill('github-repo-analyzer', '1.1.0');
console.log(result.previousVersion, '→', result.newVersion);
```

## Additional Helper Methods

The facade also exposes convenience methods for inspection:

| Method | Description |
|--------|-------------|
| `setSandboxPolicy(skillId, policy)` | Sets a per-skill sandbox policy override |
| `getSandboxViolations()` | Returns all recorded sandbox violations |
| `getLifecycleEvents(skillId?)` | Returns lifecycle events, optionally filtered by skill |
| `getTelemetryEvents()` | Returns all telemetry events |
| `getTelemetryEventsByType(type)` | Returns telemetry events filtered by type |

## Code Example

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();
const { manifest, handler } = createGitHubRepoAnalyzer();

// 1. Register
mp.registerSkill(manifest, handler);

// 2. Install with permissions
const installResult = mp.installSkill(manifest.id, manifest.permissions);
console.log('Installed:', installResult.success);

// 3. List marketplace
const entries = mp.listSkills({ category: 'development' });
console.log('Development skills:', entries.length);

// 4. Execute
const result = await mp.executeSkill(manifest.id, 'analyze', { repository: 'owner/repo' }, 'org-1', 'user-1');
console.log('Executed:', result.success, 'in', result.durationMs, 'ms');

// 5. Disable and re-enable
mp.disableSkill(manifest.id);
mp.enableSkill(manifest.id);

// 6. Uninstall
mp.uninstallSkill(manifest.id);

// 7. Inspect lifecycle and telemetry
console.log('Lifecycle:', mp.getLifecycleEvents(manifest.id).map((e) => e.type));
console.log('Telemetry:', mp.getTelemetryEvents().map((e) => e.type));
```
