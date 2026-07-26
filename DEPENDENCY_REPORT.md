# Dependency Report — Sprint 33.1

## Date: 2026-07-26

## Dependency Audit Results

### Circular Dependencies
**Status: ✅ None detected**

No circular dependencies exist across the 14 workspace packages. The import graph is acyclic.

### Cross-Package Import Graph
```
cli → sdk-typescript
```
Only 1 cross-package dependency edge exists in the entire monorepo.

### Internal-Path Bypass
**Status: ✅ No violations**

All cross-package imports use the package root (`index.ts` public API). No package reaches into another package's `src/` or `dist/` directory.

### Orphan Packages
**12 packages with no cross-package edges:**
- agent-runtime, automation-studio, connectors, copilot, dashboard, enterprise-rag, identity-platform, knowledge-graph, marketplace, multi-agent, security-governance, skills-marketplace

These packages are self-contained and export public APIs for external consumption. This is the expected architecture — packages are designed to be consumed via their npm package interface, not via direct source imports.

### Duplicate Dependency Versions
**Status: ✅ All unified**

After unification, all shared dependencies use consistent versions across all 14 packages.

## Unified Dependency Versions

### Dev Dependencies (all 14 packages)

| Dependency | Version | Packages |
|------------|---------|----------|
| typescript | ^5.6.0 | All 14 |
| tsx | ^4.19.0 | All 14 |
| eslint | ^9.12.0 | 12 (cli & sdk-typescript added) |
| @eslint/js | ^9.12.0 | 12 (cli & sdk-typescript added) |
| typescript-eslint | ^8.8.0 | 12 (cli & sdk-typescript added) |
| globals | ^15.9.0 | 12 (cli & sdk-typescript added) |
| @types/node | ^22.0.0 | All 14 (newly added) |

### Root-Only Dev Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| vite | ^5.4.2 | Frontend build tool |
| vitest | ^2.1.8 | Test runner (root app) |
| @vitejs/plugin-react | ^4.3.1 | React plugin for Vite |
| tailwindcss | ^3.4.1 | CSS framework |
| postcss | ^8.4.35 | CSS processor |
| autoprefixer | ^10.4.18 | CSS autoprefixer |
| @types/react | ^18.3.5 | React types |
| @types/react-dom | ^18.3.0 | React DOM types |
| eslint-plugin-react-hooks | ^5.1.0-rc.0 | React hooks linting |
| eslint-plugin-react-refresh | ^0.4.11 | React refresh linting |

### Runtime Dependencies

| Dependency | Version | Package | Purpose |
|------------|---------|---------|---------|
| @supabase/supabase-js | ^2.57.4 | root | Backend/database |
| react | ^18.3.1 | root, dashboard | UI framework |
| react-dom | ^18.3.1 | root, dashboard | React DOM |
| lucide-react | ^0.344.0 | root, dashboard | Icons |
| @compilerai/sdk-typescript | `*` | cli, dashboard | Internal SDK |
| @tanstack/react-query | ^5.59.0 | dashboard | Data fetching |
| react-router-dom | ^6.26.0 | dashboard | Routing |
| recharts | ^2.12.0 | dashboard | Charts |

## Changes Made in Sprint 33.1

### Version Unification
- **typescript**: Root & dashboard updated from ^5.5.3 → ^5.6.0
- **eslint**: 4 packages updated from ^9.0.0 → ^9.12.0; root & dashboard updated from ^9.9.1 → ^9.12.0
- **@eslint/js**: Same pattern as eslint
- **typescript-eslint**: 4 packages updated from ^8.0.0 → ^8.8.0; root & dashboard updated from ^8.3.0 → ^8.8.0
- **globals**: 11 packages updated from ^15.0.0 → ^15.9.0; dashboard updated from ^15.9.1 → ^15.9.0
- **tsx**: Dashboard updated from ^4.23.1 → ^4.19.0
- **vitest**: Root & dashboard updated from invalid ^4.1.10 → ^2.1.8
- **@types/node**: Added ^22.0.0 to all 14 packages (was missing everywhere)

### Missing Dependencies Added
- **cli**: Added eslint, @eslint/js, typescript-eslint, globals, @types/node; added `lint` script
- **sdk-typescript**: Added eslint, @eslint/js, typescript-eslint, globals, @types/node

### Workspace Configuration
- Root `package.json` now declares `workspaces` array with all 14 packages
- Internal dependency links changed from `file:../sdk-typescript` to `*` (workspace protocol)

### Scripts Added
- `npm run validate` — Full quality gate
- `npm run build:packages` — Build all packages
- `npm run typecheck:packages` — Typecheck all packages
- `npm run lint:packages` — Lint all packages
- `npm run test:packages` — Test all packages
- `npm run audit:deps` — Dependency audit

## Dependency Health

| Metric | Value |
|--------|-------|
| Total packages | 14 |
| Total tests | 1902 |
| Circular dependencies | 0 |
| Internal-path bypass violations | 0 |
| Version mismatches | 0 |
| Orphan packages | 12 (expected) |
| Cross-package edges | 1 (cli → sdk-typescript) |
