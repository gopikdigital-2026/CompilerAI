# SDK — Skill Development Guide

The SDK module (`src/sdk/`) provides a fluent builder API for authoring skills. You construct a `SkillManifest` and a `SkillHandler` together, validate them, and pass the result to `SkillsMarketplace.registerSkill()`.

## SkillBuilder

`SkillBuilder` is a chainable builder. Every method returns `this`, so calls can be chained. `build()` performs validation and returns the final `{ manifest, handler }` pair.

### Builder Methods

| Method | Parameter(s) | Description |
|--------|--------------|-------------|
| `.id(id)` | `string` | Unique skill identifier |
| `.name(name)` | `string` | Human-readable skill name |
| `.description(desc)` | `string` | Short description |
| `.version(ver)` | `string` | SemVer version string |
| `.author(author)` | `string` | Author name |
| `.organization(org)` | `string` | Owning organization |
| `.category(cat)` | `SkillCategory` | One of 7 categories |
| `.tags(...tags)` | `string[]` | Tags for marketplace discovery |
| `.dependencies(deps)` | `SkillDependency[]` | Required/optional skill dependencies |
| `.permissions(perms)` | `SkillPermission[]` | Required permissions |
| `.capabilities(...caps)` | `string[]` | Declared capabilities |
| `.compatibleConnectors(...c)` | `string[]` | Connector compatibility list |
| `.minPlatformVersion(v)` | `string` | Minimum platform version |
| `.commands(...cmds)` | `SkillCommand[]` | Commands the skill exposes |
| `.actions(...acts)` | `SkillAction[]` | Actions the skill performs |
| `.events(...evts)` | `SkillEvent[]` | Events the skill emits |
| `.execute(handler)` | `SkillHandler` | The async handler function |
| `.build()` | — | Validates and returns `{ manifest, handler }` |

### Validation

`build()` throws if any required field is missing:

- `id` — *"Skill id is required"*
- `name` — *"Skill name is required"*
- `version` — *"Skill version is required"*
- `author` — *"Skill author is required"*
- `organization` — *"Skill organization is required"*
- `handler` — *"Skill handler is required"*

Optional fields default to sensible values: `category` → `'custom'`, `tags` → `[]`, `dependencies` → `[]`, `permissions` → `[]`, `minPlatformVersion` → `'1.0.0'`, etc.

## Factory Helpers

### `createSkill()`

Returns a new `SkillBuilder` instance. Entry point for all skill authoring.

```typescript
const builder = createSkill();
```

### `createCommand(name, description, parameters?)`

Creates a `SkillCommand` with an optional parameter list.

```typescript
const cmd = createCommand('analyze', 'Analyze a repository', [
  createParameter('repository', 'string', true, 'Repository name (owner/repo)'),
]);
```

### `createParameter(name, type, required, description, defaultValue?)`

Creates a `SkillParameter`. Supported types: `'string' | 'number' | 'boolean' | 'object' | 'array'`. The `defaultValue` is included only when provided.

```typescript
const param = createParameter('depth', 'string', false, 'Analysis depth', 'standard');
```

### `createPermission(resource, access, reason)`

Creates a `SkillPermission` declaring a required resource and access levels.

```typescript
const perm = createPermission('github', ['read'], 'Read repository metadata and files');
```

### `createDependency(skillId, versionRange, optional?)`

Creates a `SkillDependency` on another skill. `optional` defaults to `false`.

```typescript
const dep = createDependency('code-formatter', '>=1.0.0', false);
```

## Skill Manifest Structure

The `SkillManifest` produced by `build()`:

```typescript
interface SkillManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  organization: string;
  category: SkillCategory;
  tags: string[];
  dependencies: SkillDependency[];
  permissions: SkillPermission[];
  capabilities: string[];
  compatibleConnectors: string[];
  minPlatformVersion: string;
  commands: SkillCommand[];
  actions: SkillAction[];
  events: SkillEvent[];
}
```

## Handler Function Signature

The handler receives a `SkillExecutionContext` and returns a `SkillExecutionResult` (or a Promise of one):

```typescript
interface SkillHandlerContext {
  skillId: string;
  command: string;
  parameters: Record<string, unknown>;
  organizationId: string;
  userId: string;
  grantedPermissions: SkillPermission[];
  invocationId: string;
}

type SkillHandler = (ctx: SkillExecutionContext) => Promise<SkillExecutionResult> | SkillExecutionResult;
```

The handler must populate `invocationId`, `skillId`, and `command` from the context. The sandbox overwrites `durationMs`, `startedAt`, and `completedAt` with measured values.

## Complete Example

```typescript
import {
  SkillsMarketplace,
  createSkill,
  createCommand,
  createParameter,
  createPermission,
  createDependency,
} from '@compilerai/skills-marketplace';

const { manifest, handler } = createSkill()
  .id('code-quality-checker')
  .name('Code Quality Checker')
  .description('Checks code quality metrics for a repository')
  .version('1.2.0')
  .author('Jane Developer')
  .organization('my-org')
  .category('development')
  .tags('code-quality', 'linting', 'ci')
  .dependencies([createDependency('code-formatter', '>=1.0.0')])
  .permissions([createPermission('github', ['read'], 'Read repository files')])
  .capabilities('linting', 'metrics')
  .compatibleConnectors('github')
  .minPlatformVersion('1.0.0')
  .commands(
    createCommand('check', 'Run quality checks', [
      createParameter('repository', 'string', true, 'Repository (owner/repo)'),
      createParameter('strict', 'boolean', false, 'Fail on warnings', false),
    ]),
  )
  .execute(async (ctx) => {
    const repo = ctx.parameters.repository as string;
    return {
      invocationId: ctx.invocationId,
      skillId: ctx.skillId,
      command: ctx.command,
      success: true,
      output: { repository: repo, score: 92, issues: [] },
      durationMs: 0,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      telemetry: { repo },
    };
  })
  .build();

const mp = new SkillsMarketplace();
mp.registerSkill(manifest, handler);
mp.installSkill(manifest.id, manifest.permissions);

const result = await mp.executeSkill(manifest.id, 'check', { repository: 'owner/repo' }, 'org-1', 'user-1');
console.log(result.output); // { repository: 'owner/repo', score: 92, issues: [] }
```
