# Architecture

## Package Structure

```
packages/marketplace/
├── src/
│   ├── models/
│   │   └── ToolManifest.ts       # Domain types, interfaces, constants
│   ├── errors/
│   │   └── MarketplaceErrors.ts  # Typed error hierarchy
│   ├── services/
│   │   ├── MarketplaceRepository.ts      # In-memory persistence (IMarketplaceRepository)
│   │   ├── ToolRegistry.ts               # Register/retrieve/list tools
│   │   ├── ToolManifestValidator.ts      # Structural manifest validation
│   │   ├── ToolSignatureVerifier.ts      # Signature + checksum verification
│   │   ├── ToolCompatibilityChecker.ts   # Runtime + dependency compatibility
│   │   ├── ToolPermissionAnalyzer.ts     # Permission classification + risk scoring
│   │   ├── ToolInstaller.ts              # Orchestrates full install pipeline
│   │   ├── ToolUninstaller.ts            # Dependency-safe removal
│   │   ├── ToolVersionManager.ts         # Versioning, deprecation, rollback
│   │   └── ToolSearchService.ts          # Search, filter, sort, paginate
│   ├── api/
│   │   └── MarketplaceService.ts         # Facade exposing all operations
│   └── index.ts                          # Public exports
├── tests/
│   ├── helpers.ts                        # Test fixture factories
│   ├── validator.test.ts                 # Manifest validation unit tests
│   ├── signature.test.ts                 # Signature verification unit tests
│   ├── permissions.test.ts               # Permission analysis unit tests
│   ├── compatibility.test.ts             # Compatibility checker unit tests
│   ├── search.test.ts                    # Search service unit tests
│   ├── versions.test.ts                  # Version manager unit tests
│   ├── integration.test.ts               # Install/uninstall lifecycle integration
│   ├── security.test.ts                  # Security-focused tests
│   └── service.test.ts                   # MarketplaceService API integration
├── examples/
│   └── sample-tool/tool.json             # Example manifest
└── docs/
    ├── architecture.md
    ├── tool-manifest.md
    ├── security.md
    └── api-gaps.md
```

## Design Principles

### 1. No Code Execution

The marketplace never loads, imports, or executes tool code. It only validates metadata and records installation state. This is a core security boundary.

### 2. Layered Validation Pipeline

Installation flows through ordered checks:

```
Manifest Validation → Signature Verification → Compatibility Check → Permission Analysis → Install + Audit
```

Any failing check aborts the installation and records a failed audit entry.

### 3. Repository Pattern

`IMarketplaceRepository` abstracts persistence. `InMemoryMarketplaceRepository` is provided for tests and development. A Supabase-backed implementation can be added without changing any service code.

### 4. Organization Isolation

All installation state is keyed by `organizationId`. One organization cannot see, modify, or uninstall another organization's tools.

### 5. Audit Trail

Every install, update, uninstall, and rollback action is recorded with:
- Actor (`performedBy`)
- Previous and new versions
- Success/failure status
- Reason (error message on failure)
- Timestamp

### 6. Service Facade

`MarketplaceService` wraps all individual services behind a single API, making the package easy to consume while keeping each service independently testable.

## Data Flow

```
                    ┌─────────────────────────────────────┐
                    │       MarketplaceService             │
                    │  (facade — public API surface)       │
                    └──────────┬──────────────────────────  ┘
                               │
        ┌──────────┬───────────┼───────────┬──────────┐
        ▼          ▼           ▼           ▼          ▼
   Registry    Installer   Search     VersionMgr  Uninstaller
        │          │           │           │          │
        │     ┌────┴────┐      │           │          │
        │     ▼         ▼      │           │          │
        │ Validator  SigVer    │           │          │
        │     │         │      │           │          │
        │     ▼         ▼      │           │          │
        │ CompatChk  PermAnal  │           │          │
        │     │         │      │           │          │
        └─────┴─────────┴──────┴───────────┴──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  IMarketplaceRepo    │
                    │  (persistence layer) │
                    └─────────────────────┘
```

## Integration Points

- **CompilerAI Runtime**: Tools declare `runtimeCompatibility` to indicate which runtimes they support
- **Tool Intelligence Engine**: The marketplace provides tool metadata that the Tool Intelligence Engine can use for tool selection
- **Dashboard**: The observability dashboard can display installed tools, audit logs, and marketplace browse views
- **SDK**: The TypeScript SDK can wrap marketplace operations for programmatic access
- **CLI**: The CLI can provide `compiler tools install <id>` commands backed by this package

See [docs/api-gaps.md](api-gaps.md) for pending integration details.
