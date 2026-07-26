# @compilerai/skills-marketplace v1.0.0

> AI Skills Marketplace — a system to register, install, update, and execute reusable skills that extend CompilerAI capabilities. Skills run in a sandboxed environment with explicit permissions.

## Overview

The AI Skills Marketplace lets developers package reusable capabilities as **skills** — self-contained units with a declarative manifest, a typed command handler, explicit permission requirements, and SemVer version history. Skills are registered into a central registry, discovered through a searchable marketplace catalog, installed with user-granted permissions, and executed inside a sandbox that enforces time, memory, and resource limits.

Every skill lifecycle transition (install, activate, update, deactivate, uninstall) is recorded, and every execution, permission denial, and sandbox violation is captured as a telemetry event — giving operators full observability into skill behavior.

## Key Features

- **Skill registry** with SemVer version history and status tracking
- **SDK for skill development** — fluent `SkillBuilder` API with factory helpers
- **Marketplace catalog** with search, category, tag, and connector filtering
- **Installer** with automatic dependency resolution and auto-install
- **Granular permission system** — 10 protected resources, 4 access levels
- **Sandboxed execution** with timeout, memory, and resource-policy enforcement
- **Lifecycle management** — 5 lifecycle event types recorded per skill
- **Telemetry** — 7 event types covering installs, updates, executions, denials, and violations
- **3 example skills** — GitHub Repo Analyzer, Gmail Thread Summarizer, Google Drive Knowledge Importer

## Quick Start

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();

// Register a skill
const { manifest, handler } = createGitHubRepoAnalyzer();
mp.registerSkill(manifest, handler);

// Install with permissions
mp.installSkill(manifest.id, manifest.permissions);

// Execute
const result = await mp.executeSkill(manifest.id, 'analyze', { repository: 'owner/repo' }, 'org-1', 'user-1');
console.log(result.output);
```

## Module Table

The package is organized into 11 modules:

| Module | Path | Description |
|--------|------|-------------|
| api | `src/api/` | `SkillsMarketplace` facade orchestrating all subsystems |
| registry | `src/registry/` | `SkillRegistry` — skill storage, lookup, filtering, version history |
| sdk | `src/sdk/` | `SkillBuilder` fluent API and factory helpers for authoring skills |
| marketplace | `src/marketplace/` | `Marketplace` — searchable catalog with compatibility checks |
| installer | `src/installer/` | `SkillInstaller` — install, uninstall, update, enable, disable |
| permissions | `src/permissions/` | `PermissionEngine` — validate and check granular access |
| sandbox | `src/sandbox/` | `SkillSandbox` — policy enforcement and violation recording |
| lifecycle | `src/lifecycle/` | `LifecycleManager` — record and retrieve lifecycle events |
| telemetry | `src/telemetry/` | `TelemetryEngine` — emit and query telemetry events |
| examples | `src/examples/` | 3 ready-to-use example skills |
| models | `src/models.ts` | All domain interfaces, types, and data structures |

## Package Stats

| Metric | Value |
|--------|-------|
| Source files | 12 (11 modules + `index.ts`) |
| Test files | 9 |
| Tests | 88 (all passing) |
| Line coverage | 97.46% |
| Branch coverage | 91.25% |
| Function coverage | 96.15% |

## Example Skills

| Skill | Category | Permission | Commands |
|-------|----------|------------|----------|
| GitHub Repository Analyzer | development | `github:read` | `analyze`, `summarize` |
| Gmail Thread Summarizer | productivity | `gmail:read` | `summarize`, `extractActions` |
| Google Drive Knowledge Importer | integration | `google_drive:read`, `knowledge_graph:write`, `enterprise_rag:write` | `import`, `linkEntities` |

## Documentation

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | System architecture, data flow, and module interactions |
| [docs/sdk.md](docs/sdk.md) | SkillBuilder fluent API and skill authoring guide |
| [docs/registry.md](docs/registry.md) | Skill record structure and registry operations |
| [docs/permissions.md](docs/permissions.md) | Permission resources, access levels, and validation |
| [docs/sandbox.md](docs/sandbox.md) | Sandbox policy, isolation, and violation recording |
| [docs/lifecycle.md](docs/lifecycle.md) | Lifecycle event types and management |
| [docs/api.md](docs/api.md) | Public API reference for `SkillsMarketplace` |
| [docs/examples.md](docs/examples.md) | 14 complete runnable examples |
| [VALIDATION_REPORT.md](VALIDATION_REPORT.md) | Full validation and acceptance criteria report |

## Installation

```bash
npm install @compilerai/skills-marketplace
```

## License

MIT
