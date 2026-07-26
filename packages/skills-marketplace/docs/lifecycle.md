# Lifecycle Management

The lifecycle module (`src/lifecycle/`) provides `LifecycleManager`, an append-only store that records every state transition a skill undergoes from install through uninstall.

## Lifecycle Event Types (5)

| Event Type | Recorded When |
|------------|---------------|
| `install` | A skill is successfully installed |
| `activate` | A skill is enabled (activated) |
| `update` | A skill is updated to a new version |
| `deactivate` | A skill is disabled (deactivated) |
| `uninstall` | A skill is uninstalled |

## LifecycleEvent Structure

```typescript
interface LifecycleEvent {
  type: LifecycleEventType;
  skillId: string;
  version: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
```

The `metadata` field carries event-specific context. For `install` events it includes `dependenciesInstalled`. For `update` events it includes `previousVersion` and `changelog`. For `uninstall` events it includes `dependenciesRemoved`.

## When Events Are Recorded

The `SkillInstaller` records lifecycle events at each transition:

| Operation | Event | Trigger |
|-----------|-------|---------|
| `install()` | `install` | After successful permission check and dependency resolution |
| `enable()` | `activate` | When an installed skill is enabled |
| `update()` | `update` | After a skill's manifest version is changed |
| `disable()` | `deactivate` | When an installed skill is disabled |
| `uninstall()` | `uninstall` | After a skill's status is set to `uninstalled` |

Each event is also paired with a corresponding telemetry event (`skill.installed`, `skill.enabled`, `skill.updated`, `skill.disabled`).

## LifecycleManager Methods

### `recordEvent(event: LifecycleEvent): void`

Appends a lifecycle event to the internal store.

### `getEvents(skillId?: string): LifecycleEvent[]`

Returns all events, or events filtered by skill ID when provided. Always returns a copy (defensive).

### `getEventsByType(type: LifecycleEventType): LifecycleEvent[]`

Returns events filtered by event type (e.g., all `install` events).

### `clear(): void`

Removes all recorded events.

## Code Example

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();
const { manifest, handler } = createGitHubRepoAnalyzer();
mp.registerSkill(manifest, handler);

// Install → records 'install' lifecycle event
mp.installSkill(manifest.id, manifest.permissions);

// Enable → records 'activate' lifecycle event
mp.enableSkill(manifest.id);

// Disable → records 'deactivate' lifecycle event
mp.disableSkill(manifest.id);

// Retrieve all lifecycle events for this skill
const events = mp.getLifecycleEvents(manifest.id);
console.log(events.map((e) => e.type));
// ['install', 'activate', 'deactivate']

// Retrieve events by type across all skills
const allInstalls = mp.lifecycle.getEventsByType('install');
console.log(allInstalls.length); // 1
console.log(allInstalls[0].skillId); // 'github-repo-analyzer'
console.log(allInstalls[0].version); // '1.0.0'

// Uninstall → records 'uninstall' lifecycle event
mp.uninstallSkill(manifest.id);

const finalEvents = mp.getLifecycleEvents(manifest.id);
console.log(finalEvents.map((e) => e.type));
// ['install', 'activate', 'deactivate', 'uninstall']
```
