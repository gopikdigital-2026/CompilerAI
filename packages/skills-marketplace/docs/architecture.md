# Architecture

## Overview

The AI Skills Marketplace is structured as a layered system. Skill authors use the **SDK** to build skills, which are registered into the **Registry**. The **Marketplace** provides searchable discovery over the registry. The **Installer** handles install, update, enable, and disable operations with permission validation and dependency resolution. The **Sandbox** executes skill handlers under a policy that enforces timeouts, memory limits, and resource restrictions. The **Lifecycle Manager** and **Telemetry Engine** record events throughout. The **API** facade (`SkillsMarketplace`) wires these subsystems together into a single entry point.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Developer / Consumer                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SDK (SkillBuilder)                              │
│   createSkill() · createCommand() · createParameter()              │
│   createPermission() · createDependency()                          │
│   Produces: { manifest: SkillManifest, handler: SkillHandler }      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  registerSkill(manifest, handler)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API Facade                                    │
│                   SkillsMarketplace                                  │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Registry │ │Installer  │ │ Sandbox  │ │Lifecycle │ │Telemetry│ │
│  └────┬─────┘ └─────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ │
│       │             │            │             │            │       │
│       ▼             ▼            ▼             ▼            ▼       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Marketplace (search)                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  executeSkill()
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Sandbox (Execution)                              │
│   Policy check → Timeout race → Handler(ctx) → Result + Telemetry   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 SkillExecutionResult                                  │
│   { invocationId, success, output, error?, durationMs, telemetry }  │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Descriptions (11)

### 1. api (`src/api/`)
The `SkillsMarketplace` class is the public facade. It instantiates all subsystems in its constructor, stores registered handlers, and delegates each public method to the appropriate subsystem. Execution flows through the sandbox with permission and command validation.

### 2. registry (`src/registry/`)
`SkillRegistry` stores `SkillRecord` entries keyed by skill ID. It preserves status and install metadata when a manifest is re-registered (enabling upgrades), maintains version history, tracks install counts, and computes a running rating average.

### 3. sdk (`src/sdk/`)
`SkillBuilder` provides a fluent chainable API for authoring skills. Factory functions (`createSkill`, `createCommand`, `createParameter`, `createPermission`, `createDependency`) produce typed manifest fragments. `build()` validates required fields and returns `{ manifest, handler }`.

### 4. marketplace (`src/marketplace/`)
`Marketplace` wraps the registry with search and compatibility logic. It filters by category, tags, status, and free-text search; checks platform-version and connector compatibility; and provides `getPopular`, `getTopRated`, and pagination.

### 5. installer (`src/installer/`)
`SkillInstaller` orchestrates install, uninstall, update, enable, and disable. During install it validates permissions via the `PermissionEngine`, auto-installs required dependencies, and records lifecycle + telemetry events. During uninstall it blocks removal when other installed skills depend on the target and cleans up orphaned dependencies.

### 6. permissions (`src/permissions/`)
`PermissionEngine` validates that all manifest-required permissions are present in the granted set. It checks per-resource access levels, returns missing permissions, and provides a summarizer for human-readable output.

### 7. sandbox (`src/sandbox/`)
`SkillSandbox` executes handlers under a `SandboxPolicy`. It enforces a timeout via `Promise.race`, records violations when handlers throw permission or sandbox errors, and supports per-skill policy overrides with a deny-by-default fallback.

### 8. lifecycle (`src/lifecycle/`)
`LifecycleManager` is an append-only event store. It records `install`, `activate`, `update`, `deactivate`, and `uninstall` events and supports retrieval by skill ID or event type.

### 9. telemetry (`src/telemetry/`)
`TelemetryEngine` is an append-only store for 7 event types (`skill.installed`, `skill.updated`, `skill.enabled`, `skill.disabled`, `skill.executed`, `permission.denied`, `sandbox.violation`). It supports retrieval of all events or filtering by type.

### 10. examples (`src/examples/`)
Three production-pattern example skills built with the SDK: GitHub Repository Analyzer, Gmail Thread Summarizer, and Google Drive Knowledge Importer. Each demonstrates manifest construction, permission declaration, command parameters, and handler implementation.

### 11. models (`src/models.ts`)
All domain interfaces and types: `SkillManifest`, `SkillRecord`, `SkillPermission`, `SandboxPolicy`, `LifecycleEvent`, `TelemetryEvent`, `MarketplaceQuery`, and the public API interfaces (`ISkillsMarketplace`, `ISkillRegistry`, `IPermissionEngine`, `ISandbox`, `ILifecycleManager`, `ITelemetryEngine`).

## Data Flow

```
1. Author builds skill      →  SDK produces { manifest, handler }
2. Consumer registers       →  API stores manifest in Registry, handler in Map
3. Consumer installs        →  Installer validates permissions (PermissionEngine)
                                  → auto-installs dependencies
                                  → Registry updates status to 'installed'
                                  → Lifecycle records 'install' event
                                  → Telemetry emits 'skill.installed'
4. Consumer executes        →  API looks up record + handler
                                  → validates command + required parameters
                                  → Sandbox executes handler under policy
                                  → Telemetry emits 'skill.executed'
                                  → returns SkillExecutionResult
5. Consumer searches        →  Marketplace filters Registry records
                                  → computes compatibility
                                  → returns MarketplaceEntry[]
```

## Permission Enforcement Flow

```
installSkill(skillId, grantedPermissions)
    │
    ▼
PermissionEngine.validate(manifest, granted)
    │
    ├─ valid?   → proceed with install
    │
    └─ missing? → emit 'permission.denied' telemetry
                    → return InstallResult { success: false, errors: [...] }
```

During execution, the sandbox's `validatePermissions` checks the policy flags (`allowDiskAccess`, `allowNetwork`, `allowEnvironment`, `allowSecrets`) before the handler runs. Violations are recorded and surfaced via `getViolations()`.

## Sandbox Isolation

Every skill handler runs through `SkillSandbox.execute()`, which:

1. **Validates the policy** — checks disk, network, environment, and secrets flags against the `SandboxPolicy`.
2. **Enforces a timeout** — races the handler against a timer set to `policy.maxExecutionTimeMs` (default 30,000 ms). If the timer fires first, the handler result is rejected.
3. **Captures violations** — when a handler throws an error containing `Sandbox:` or `Permission denied`, a `SandboxViolation` is recorded with the skill ID, invocation ID, resource, and severity.
4. **Supports per-skill policies** — `setPolicy(skillId, policy)` overrides the default deny-by-default policy for a specific skill. `getPolicy(skillId)` falls back to the default when no override exists.

The default policy is deny-all: `allowDiskAccess: false`, `allowNetwork: false`, `allowEnvironment: false`, `allowSecrets: false`, with a 30-second timeout and 128 MB memory cap.
