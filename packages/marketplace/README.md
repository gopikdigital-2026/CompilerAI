# @compilerai/marketplace

Enterprise tool marketplace for registering, validating, discovering, installing, updating, and uninstalling tools compatible with CompilerAI.

## Overview

The Marketplace provides a secure, validated pipeline for managing CompilerAI-compatible tools. Every tool is described by a `tool.json` manifest that is validated for structure, signature, checksum, permissions, runtime compatibility, and dependencies before installation. No code is executed during installation.

## Installation

```bash
npm install @compilerai/marketplace
```

## Quick Start

```typescript
import {
  MarketplaceService,
  InMemoryMarketplaceRepository,
} from '@compilerai/marketplace';

const repo = new InMemoryMarketplaceRepository();
const service = new MarketplaceService(repo);

// Register a tool
service.registerTool(manifest);

// Search for tools
const results = service.search({ text: 'data', verifiedOnly: true });

// Install a tool for an organization
const result = service.install(manifest, {
  organizationId: 'org-123',
  installedBy: 'user-456',
  targetRuntime: 'compiler-runtime',
});

// List installed tools
const installed = service.listInstalled('org-123');

// Uninstall
service.uninstall('data-enricher', {
  organizationId: 'org-123',
  performedBy: 'user-456',
});
```

## Core Services

| Service | Responsibility |
|---|---|
| `ToolRegistry` | Register, retrieve, list, and unregister tool manifests |
| `ToolManifestValidator` | Validate manifest structure, fields, and types |
| `ToolInstaller` | Orchestrate validation, signature, compatibility, permissions, then install |
| `ToolUninstaller` | Remove installed tools with dependency checking |
| `ToolVersionManager` | Publish versions, deprecate, rollback, compare semver |
| `ToolCompatibilityChecker` | Check runtime and dependency compatibility |
| `ToolPermissionAnalyzer` | Classify permissions, detect dangerous/blocked ones, assign risk levels |
| `ToolSignatureVerifier` | Verify signature matches checksum and verified status |
| `ToolSearchService` | Full-text search, filtering, sorting, pagination, suggestions |
| `MarketplaceRepository` | In-memory persistence for tools, versions, installations, audit logs |

## API Surface

The `MarketplaceService` exposes all operations through a single facade:

- `list()` — list all registered tools
- `search(query)` — search with text, category, runtime, verified filters
- `getDetail(toolId)` — get a single tool manifest
- `getVersions(toolId)` — list all published versions
- `install(manifest, options)` — install a tool for an organization
- `installFromRegistry(toolId, options)` — install from already-registered tools
- `update(toolId, options)` — update to the latest published version
- `uninstall(toolId, options)` — uninstall with dependency checking
- `verify(toolId)` — verify a tool's signature
- `listInstalled(organizationId)` — list tools installed for an organization
- `rollback(toolId, version, orgId, user)` — rollback to a previous version
- `getAuditLog(organizationId)` — get installation audit trail
- `validateManifest(manifest)` — validate without installing
- `checkCompatibility(manifest, runtime)` — check without installing
- `analyzePermissions(manifest)` — analyze without installing

## Security

- **No code execution during installation** — the marketplace only validates and records metadata
- **Manifest validation** — all required fields, types, and formats are checked
- **Signature verification** — signature must match checksum and tool must be verified
- **Permission blocking** — dangerous permissions (`execute:shell`, `env:write`, `org:admin`) are blocked by default
- **Organization isolation** — installations are scoped per `organizationId`
- **Dependency checking** — tools with unsatisfied dependencies cannot be installed or uninstalled
- **Audit trail** — every install, update, uninstall, and rollback is recorded

See [docs/security.md](docs/security.md) for details.

## Tool Manifest

See [docs/tool-manifest.md](docs/tool-manifest.md) for the full manifest specification.

## Documentation

- [Architecture](docs/architecture.md)
- [Tool Manifest Spec](docs/tool-manifest.md)
- [Security Model](docs/security.md)
- [API Gaps](docs/api-gaps.md)

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
