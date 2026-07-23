# API Gaps — Pending Integrations

This document tracks integrations between the Marketplace package and other CompilerAI platform components that are not yet implemented.

## 1. Supabase Persistence Layer

**Status**: Not implemented

The marketplace currently uses `InMemoryMarketplaceRepository` for all persistence. A Supabase-backed repository should be implemented to persist tools, versions, installations, and audit logs across restarts.

**Required tables**:
- `marketplace_tools` — registered tool manifests
- `marketplace_tool_versions` — published versions per tool
- `marketplace_installed_tools` — installed tools per organization
- `marketplace_audit_log` — installation/update/uninstall audit records

**RLS policies**: All tables must enforce organization isolation via `auth.uid()` checks on `organizationId` columns.

**Integration point**: Implement `IMarketplaceRepository` interface with Supabase client; no service-layer changes needed.

## 2. Platform API Endpoints

**Status**: Not implemented

The Platform API (`src/platform/api/`) does not yet expose marketplace endpoints. The following routes should be added:

| Method | Path | Description |
|---|---|---|
| GET | `/v1/marketplace/tools` | List/search tools |
| GET | `/v1/marketplace/tools/:id` | Get tool detail |
| GET | `/v1/marketplace/tools/:id/versions` | List versions |
| POST | `/v1/marketplace/tools/:id/install` | Install for organization |
| POST | `/v1/marketplace/tools/:id/update` | Update to latest |
| DELETE | `/v1/marketplace/tools/:id` | Uninstall |
| GET | `/v1/marketplace/installed` | List installed tools (org-scoped) |
| GET | `/v1/marketplace/audit` | Get audit log (org-scoped) |
| POST | `/v1/marketplace/tools/:id/rollback` | Rollback to version |

**Integration point**: Add route registrations in `RouteRegistration.ts`; controllers call `MarketplaceService` methods.

## 3. SDK Resource

**Status**: Not implemented

The TypeScript SDK (`@compilerai/sdk-typescript`) has a `ToolsResource` stub that rejects all calls. A `MarketplaceResource` should be added to the SDK to wrap the Platform API endpoints above.

**Integration point**: Add `MarketplaceResource` class in `packages/sdk-typescript/src/resources/marketplace.ts`.

## 4. CLI Commands

**Status**: Not implemented

The CLI package (`@compilerai/cli`) should add marketplace commands:

```
compiler tools search <query>
compiler tools install <toolId>
compiler tools uninstall <toolId>
compiler tools list
compiler tools info <toolId>
compiler tools versions <toolId>
compiler tools update <toolId>
compiler tools rollback <toolId> <version>
```

**Integration point**: Add command files in `packages/cli/src/commands/tools.ts`.

## 5. Dashboard UI

**Status**: Not implemented

The observability dashboard should add a Marketplace page for browsing, searching, installing, and managing tools.

**Integration point**: Add feature page in `packages/dashboard/src/features/marketplace/`.

## 6. Tool Intelligence Engine Integration

**Status**: Partially designed

The Tool Intelligence Engine (`src/compiler/core/intelligence/tools/`) selects tools for execution plans. It should query the marketplace registry for available tools and filter by `runtimeCompatibility` and `permissions`.

**Integration point**: `ToolRegistry` in the intelligence engine should read from `MarketplaceRepository.getInstalledTools()` to know which tools are available for a given organization.

## 7. External Tool Registry Sync

**Status**: Not implemented

A future capability to sync tools from an external registry (e.g., npm, GitHub) into the marketplace. This would require:
- External registry adapter
- Automatic manifest generation from package metadata
- Checksum and signature generation pipeline
- Batch import tooling

**Integration point**: New `ToolRegistrySyncService` that calls `ToolRegistry.register()` for each imported tool.
