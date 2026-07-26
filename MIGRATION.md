# Migration Guide — CompilerAI Enterprise v1.0.0-rc1

This document guides developers through migrating to CompilerAI Enterprise v1.0 RC1.

## From Pre-Release to v1.0.0-rc1

### Monorepo Structure

The project is now a proper npm workspace monorepo. All packages are installed from the root:

```bash
# Before (per-package install)
cd packages/observability && npm install
cd packages/resilience && npm install

# After (single root install)
npm install
```

### Dependency Versions

All packages now share unified dependency versions:

| Dependency | Previous | Current |
|------------|----------|---------|
| typescript | ^5.5.3 / ^5.6.0 | ^5.6.0 |
| eslint | ^9.0.0 / ^9.9.1 / ^9.12.0 | ^9.12.0 |
| @eslint/js | ^9.0.0 / ^9.9.1 / ^9.12.0 | ^9.12.0 |
| typescript-eslint | ^8.0.0 / ^8.3.0 / ^8.8.0 | ^8.8.0 |
| globals | ^15.0.0 / ^15.9.0 | ^15.9.0 |
| @types/node | (missing) | ^22.0.0 |
| vitest | ^4.1.10 (invalid) | ^2.1.8 |

### New Scripts

| Command | Description |
|---------|-------------|
| `npm run validate` | Full quality gate (typecheck, lint, test, build) |
| `npm run quality:gates` | Enterprise quality gates with coverage and complexity checks |
| `npm run audit:deps` | Dependency audit (circular, orphans, duplicates, bypass) |
| `npm run build:packages` | Build all workspace packages |
| `npm run typecheck:packages` | Typecheck all workspace packages |
| `npm run lint:packages` | Lint all workspace packages |
| `npm run test:packages` | Test all workspace packages |

### New Packages

Two new packages were added in this release:

1. **@compilerai/observability** — Observability & AIOps platform
2. **@compilerai/resilience** — Resilience & Disaster Recovery platform

Both are available via workspace protocol and export full public APIs.

### Database Migrations

No new migrations are required for this release. The existing 11 migrations remain compatible.

### Breaking Changes

There are no breaking changes in this release. All existing APIs remain compatible.

### Deprecated APIs

No APIs are deprecated in this release.
