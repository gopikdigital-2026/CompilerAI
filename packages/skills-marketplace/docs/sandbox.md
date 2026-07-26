# Sandbox

The sandbox module (`src/sandbox/`) provides `SkillSandbox`, which executes skill handlers under an enforced `SandboxPolicy`. It is the runtime isolation boundary for all skill execution.

## SandboxPolicy Structure

```typescript
interface SandboxPolicy {
  allowDiskAccess: boolean;
  allowNetwork: boolean;
  allowEnvironment: boolean;
  allowSecrets: boolean;
  allowedPaths: string[];
  allowedDomains: string[];
  maxExecutionTimeMs: number;
  maxMemoryMB: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `allowDiskAccess` | `boolean` | Whether filesystem access is permitted |
| `allowNetwork` | `boolean` | Whether outbound network calls are permitted |
| `allowEnvironment` | `boolean` | Whether environment variables are readable |
| `allowSecrets` | `boolean` | Whether secrets/credentials are accessible |
| `allowedPaths` | `string[]` | Whitelist of filesystem paths |
| `allowedDomains` | `string[]` | Whitelist of network domains |
| `maxExecutionTimeMs` | `number` | Hard execution timeout in milliseconds |
| `maxMemoryMB` | `number` | Memory limit in megabytes |

## Default Policy (Deny All)

When no custom policy is set, the sandbox uses a deny-by-default policy:

```typescript
{
  allowDiskAccess: false,
  allowNetwork: false,
  allowEnvironment: false,
  allowSecrets: false,
  allowedPaths: [],
  allowedDomains: [],
  maxExecutionTimeMs: 30000,
  maxMemoryMB: 128,
}
```

All access flags default to `false`. The default timeout is 30 seconds and the memory cap is 128 MB. The constructor accepts a `Partial<SandboxPolicy>` to override specific defaults.

## Timeout Enforcement

The sandbox enforces the execution timeout using `Promise.race`:

```typescript
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(
    () => reject(new Error(`Sandbox: execution timeout after ${policy.maxExecutionTimeMs}ms`)),
    policy.maxExecutionTimeMs,
  ),
);

const result = await Promise.race([handler(context), timeoutPromise]);
```

If the timeout fires before the handler resolves, the race rejects with a `Sandbox:` error, which is caught and recorded as a violation. The returned `SkillExecutionResult` has `success: false` and the timeout error message.

## Violation Recording

When a handler throws an error whose message contains `Sandbox:` or `Permission denied`, the sandbox records a `SandboxViolation`:

```typescript
interface SandboxViolation {
  skillId: string;
  invocationId: string;
  violation: string;
  resource: string;
  timestamp: string;
  severity: 'warning' | 'error';
}
```

The `resource` field is extracted from the error message (`filesystem`, `network`, `environment`, `secrets`, `permission`, or `unknown`). Violations are stored in an internal list and retrieved via `getViolations()`.

## Per-Skill Policies

The sandbox maintains a `Map<string, SandboxPolicy>` for per-skill overrides:

### `setPolicy(skillId, policy): void`

Registers a custom policy for a specific skill, overriding the default.

### `getPolicy(skillId): SandboxPolicy | undefined`

Returns the per-skill policy if one exists, otherwise falls back to the default policy.

During execution, the `SkillsMarketplace` resolves the policy as:
```typescript
const policy = this.sandbox.getPolicy(skillId) ?? this.sandbox.getPolicy('__default')!;
```

## SkillSandbox Methods

| Method | Description |
|--------|-------------|
| `execute(handler, context, policy)` | Runs the handler under the policy with timeout enforcement |
| `getViolations()` | Returns a copy of all recorded violations |
| `setPolicy(skillId, policy)` | Sets a per-skill policy override |
| `getPolicy(skillId)` | Gets the per-skill policy or falls back to default |
| `recordViolation(context, violation, severity)` | Manually records a violation |
| `clearViolations()` | Clears all recorded violations |

## Code Example

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();
const { manifest, handler } = createGitHubRepoAnalyzer();
mp.registerSkill(manifest, handler);
mp.installSkill(manifest.id, manifest.permissions);

// Set a custom sandbox policy for this skill
mp.setSandboxPolicy(manifest.id, {
  allowDiskAccess: false,
  allowNetwork: true,
  allowEnvironment: false,
  allowSecrets: false,
  allowedPaths: [],
  allowedDomains: ['api.github.com'],
  maxExecutionTimeMs: 10000,
  maxMemoryMB: 64,
});

const result = await mp.executeSkill(manifest.id, 'analyze', { repository: 'owner/repo' }, 'org-1', 'user-1');
console.log(result.success);   // true
console.log(result.durationMs); // measured execution time

// Check for any violations
const violations = mp.getSandboxViolations();
console.log(violations); // [] — no violations occurred
```
