# Skill Registry

The registry module (`src/registry/`) provides `SkillRegistry`, the central store for all registered skills. It is the source of truth for skill metadata, status, version history, install counts, and ratings.

## SkillRecord Structure

Each registered skill is stored as a `SkillRecord`:

```typescript
interface SkillRecord {
  manifest: SkillManifest;        // The full skill manifest
  status: SkillStatus;            // 'registered' | 'installed' | 'disabled' | 'uninstalled'
  installedAt?: string;           // ISO timestamp of first install
  updatedAt?: string;             // ISO timestamp of last update or disable
  enabledAt?: string;             // ISO timestamp of last enable
  versionHistory: SkillVersion[]; // Chronological version entries
  rating: SkillRating;            // Aggregate rating
  installCount: number;           // Total install count
}

interface SkillVersion {
  version: string;
  releaseDate: string;
  changelog: string;
  deprecated: boolean;
}

interface SkillRating {
  average: number;
  count: number;
  distribution: Record<number, number>;
}
```

When a manifest is registered for the first time, the registry initializes `versionHistory` with a single entry (`{ version, changelog: 'Initial release', deprecated: false }`), sets `rating` to `{ average: 0, count: 0, distribution: {} }`, and `installCount` to `0`.

Re-registering a manifest with the same ID **preserves** existing status, timestamps, version history, rating, and install count — enabling in-place upgrades.

## Registry Operations

### `register(manifest): SkillRecord`

Registers a skill manifest. If the ID already exists, the manifest is updated while preserving status and metadata. Returns the resulting `SkillRecord`.

### `unregister(skillId): boolean`

Removes a skill from the registry entirely. Returns `true` if the skill existed, `false` otherwise.

### `get(skillId): SkillRecord | undefined`

Retrieves a single skill record by ID.

### `list(): SkillRecord[]`

Returns all registered skill records as an array.

### `listByCategory(category): SkillRecord[]`

Filters skills by one of the 7 categories: `productivity`, `development`, `analytics`, `communication`, `integration`, `security`, `custom`.

### `listByTag(tag): SkillRecord[]`

Filters skills whose `tags` array includes the given tag.

### `updateStatus(skillId, status): void`

Updates a skill's status and sets relevant timestamps:
- `installed` → sets `installedAt`; sets `enabledAt` if not already set
- `disabled` → sets `updatedAt`

### `addVersion(skillId, version): void`

Appends a `SkillVersion` entry to the skill's version history and updates `updatedAt`.

### `incrementInstallCount(skillId): void`

Increments the install counter, called by the installer on each successful install.

### `updateRating(skillId, rating): void`

Records a new rating (1–5). Recomputes the running average, increments the count, and updates the distribution histogram.

## Category and Tag Filtering

Categories are a fixed enum of 7 values. Tags are free-form strings defined in the manifest. Both support filtering through dedicated registry methods and through the marketplace's `MarketplaceQuery`.

## Version History

Version history is an append-only list of `SkillVersion` entries. The installer's `update()` method uses this history to find target versions for upgrades or rollbacks. A version marked `deprecated: true` cannot be installed via `update()`.

## Rating System

Ratings are tracked as a running average. Each call to `updateRating()` adds a score (typically 1–5), increments the count, and updates the distribution map. The marketplace's `getTopRated()` method uses `rating.average` to rank skills with at least one rating.

## Code Example

```typescript
import { SkillRegistry, createSkill, createCommand } from '@compilerai/skills-marketplace';

const registry = new SkillRegistry();

// Register a skill
const { manifest } = createSkill()
  .id('my-skill')
  .name('My Skill')
  .description('A demonstration skill')
  .version('1.0.0')
  .author('Jane')
  .organization('my-org')
  .category('development')
  .tags('demo', 'testing')
  .commands(createCommand('run', 'Run the skill'))
  .execute(async (ctx) => ({
    invocationId: ctx.invocationId,
    skillId: ctx.skillId,
    command: ctx.command,
    success: true,
    output: 'done',
    durationMs: 0,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    telemetry: {},
  }))
  .build();

const record = registry.register(manifest);
console.log(record.status);           // 'registered'
console.log(record.versionHistory);   // [{ version: '1.0.0', ... }]
console.log(record.installCount);     // 0

// Filter by category
const devSkills = registry.listByCategory('development');

// Filter by tag
const tagged = registry.listByTag('demo');

// Add a version and update
registry.addVersion('my-skill', {
  version: '1.1.0',
  releaseDate: new Date().toISOString(),
  changelog: 'Added new features',
  deprecated: false,
});

// Record a rating
registry.updateRating('my-skill', 5);
console.log(registry.get('my-skill')?.rating); // { average: 5, count: 1, distribution: { 5: 1 } }
```
