# Developer Guide — CompilerAI Enterprise v1.0 RC1

This guide covers project structure, package conventions, adding new packages, writing tests, the validation gate, code quality standards, import discipline, and the database migration process.

---

## Project Structure Overview

```
compileraI/
├── packages/              # 16 workspace packages
│   ├── agent-runtime/     # Multi-agent execution runtime
│   ├── automation-studio/ # Visual workflow designer
│   ├── cli/               # Terminal CLI (depends on sdk-typescript)
│   ├── connectors/        # External service integrations
│   ├── copilot/           # NL → workflow transformation
│   ├── dashboard/         # Monitoring dashboard
│   ├── enterprise-rag/    # RAG engine
│   ├── identity-platform/ # Multi-tenant IAM
│   ├── knowledge-graph/   # Persistent shared memory
│   ├── marketplace/       # Tool marketplace
│   ├── multi-agent/       # Agent team orchestration
│   ├── sdk-typescript/    # TypeScript SDK (build first!)
│   ├── security-governance/ # Security, audit, secrets
│   ├── skills-marketplace/# Reusable AI skills
│   ├── observability/     # Metrics, tracing, health, alerts
│   └── resilience/        # Circuit breakers, retry, failover, DR
├── src/                   # Root application (Vite + React)
│   ├── compiler/          # Intelligence pipeline + runtime
│   │   ├── core/intelligence/  # Context → Intent → Planning → Decision → Confidence
│   │   └── runtime/            # WorkflowEngine, RuntimeCoordinator
│   ├── platform/          # Platform API + identity
│   │   ├── api/           # Controllers, DTOs, routes, middleware
│   │   └── identity/      # Auth, RBAC, orgs, users
│   ├── infrastructure/    # Supabase, cache, queue, outbox, secrets
│   ├── bootstrap/         # Composition root (DI wiring)
│   ├── shared/contracts/  # Canonical interfaces
│   ├── pages/             # React pages
│   ├── components/        # React components
│   ├── contexts/          # AuthContext, LanguageContext
│   ├── hooks/             # React hooks
│   ├── services/          # Frontend services
│   └── types/             # Shared types
├── scripts/               # Build, test, audit, validate, quality-gates
├── supabase/              # 11 SQL migrations
├── tests/                 # Cross-module regression tests
└── docs/                  # Architecture, identity, infrastructure, platform-api
```

The root `package.json` declares the 16 workspace packages and defines shared scripts that operate across all of them.

---

## Package Conventions

Every package is self-contained and follows the same structure:

```
packages/<name>/
├── package.json       # Name, version, scripts, exports
├── tsconfig.json      # TypeScript config (strict, ES2022, bundler resolution)
├── eslint.config.js   # ESLint 9 flat config
├── src/
│   └── index.ts       # Public API barrel — the ONLY export surface
├── tests/             # Test files (*.test.ts)
├── dist/              # Build output (gitignored)
└── README.md
```

### package.json

```json
{
  "name": "@compilerai/<name>",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md", "docs"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint": "eslint .",
    "test": "node --test --import tsx tests/**/*.test.ts"
  }
}
```

Internal dependencies use the workspace protocol: `"@compilerai/sdk-typescript": "*"`.

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "strictNullChecks": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### eslint.config.js

All packages use ESLint 9 flat config with `typescript-eslint` recommended rules and `@eslint/js` recommended rules. The root app additionally configures `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`.

---

## Adding a New Package

1. **Create the directory:**
   ```bash
   mkdir -p packages/my-package/src packages/my-package/tests
   ```

2. **Add `package.json`** following the template above. Use `@compilerai/my-package` as the name and `1.0.0` as the version.

3. **Add `tsconfig.json`** following the template above.

4. **Add `eslint.config.js`** matching the pattern in existing packages.

5. **Register the workspace** in the root `package.json`:
   ```json
   "workspaces": [
     "packages/my-package",
     ...
   ]
   ```

6. **Create `src/index.ts`** as the public API barrel. Export only what other packages should consume.

7. **Write tests** in `tests/` using `node:test` and `node:assert/strict`.

8. **Run `npm install`** from the root to link the new workspace.

9. **Verify:**
   ```bash
   cd packages/my-package && npm run build && npm test && npm run typecheck
   npm run audit:deps   # verify no circular deps introduced
   ```

---

## Writing Tests

All package tests use Node's built-in test runner — no external test framework. Tests run entirely offline.

### Test file structure

```typescript
// tests/my-module.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { myFunction } from '../src/index.js';

describe('myFunction', () => {
  it('should return the expected result', () => {
    const result = myFunction('input');
    assert.equal(result, 'expected');
  });

  it('should handle edge cases', () => {
    assert.throws(() => myFunction(''), /invalid input/i);
  });
});
```

### Rules

- **Test runner:** `node:test` (built-in, no install needed)
- **Assertions:** `node:assert/strict` — use `assert.equal`, `assert.deepEqual`, `assert.ok`, `assert.throws`
- **Offline only:** No network calls, no database connections, no external API dependencies. Mock everything.
- **File naming:** `tests/**/*.test.ts`
- **Import source:** Import from `../src/index.js` (the compiled barrel) or `../src/<module>.js` — the `tsx` loader resolves `.ts` at runtime.
- **Deterministic:** Use injected clocks and ID generators, never `new Date()` or `Math.random()` directly. Use `createTestApplication()` from the bootstrap layer for deterministic IDs and timestamps.

### Running tests

```bash
# Single package
cd packages/observability && npm test

# All packages
npm run test:packages

# With coverage (supported by observability and resilience)
cd packages/observability && npm run test:coverage
```

---

## Running the Validation Gate

```bash
npm run validate
```

This is the single command that CI runs. It executes 8 steps in order:

| Step | Command | Critical | Timeout |
|------|---------|----------|---------|
| Audit Dependencies | `node scripts/audit-deps.mjs` | Yes | 30s |
| Typecheck Root | `npm run typecheck` | Yes | 60s |
| Typecheck Packages | `node scripts/typecheck-all.mjs` | Yes | 120s |
| Lint Root | `npm run lint` | No | 60s |
| Lint Packages | `node scripts/lint-all.mjs` | No | 120s |
| Test Packages | `node scripts/test-all.mjs` | Yes | 300s |
| Build Packages | `node scripts/build-all.mjs` | Yes | 180s |
| Build Root | `npm run build` | Yes | 120s |

Critical failures stop the gate immediately. Non-critical failures (lint) report warnings but allow the gate to pass.

For the enterprise quality gates (coverage, bundle size, docs, complexity, circular deps):

```bash
npm run quality:gates
```

---

## Code Quality Standards

- **TypeScript strict mode** — All packages use `strict: true`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`, `strictNullChecks`.
- **No `any` types** — Use explicit types or generics. Prefix intentionally unused variables with `_`.
- **No comments** unless the "why" is non-obvious. Never comment out code.
- **ESLint flat config** — All packages use ESLint 9.x flat config format with `typescript-eslint` recommended rules.
- **File size** — No source file should exceed 500 lines (quality gate warning).
- **Cyclomatic complexity** — Max 15 (quality gate, non-critical).
- **Coverage** — ≥ 90% line coverage required for observability and resilience packages (quality gate, critical). Both currently exceed 98%.
- **Bundle size** — ≤ 5 MB (current: 992 KB).
- **Conventional commits:**
  ```
  feat: add new alert type for disk space monitoring
  fix: resolve circuit breaker half-open race condition
  docs: update operations guide with backup procedures
  test: add integration tests for queue recovery
  refactor: simplify replication conflict detection
  ```

---

## Import Discipline Rules

The monorepo enforces strict import discipline via `scripts/audit-deps.mjs`, which is part of both the validation gate and quality gates.

### Rules

1. **Public API only** — Cross-package imports must go through the barrel `index.ts`. Importing from `/src/` or `/dist/` subpaths of another package is a violation (internal-path bypass).

   ```typescript
   // ✅ Correct — imports from the public API
   import { CompilerAI } from '@compilerai/sdk-typescript';

   // ❌ Wrong — internal-path bypass
   import { CompilerAI } from '@compilerai/sdk-typescript/dist/CompilerAI.js';
   import { something } from '@compilerai/sdk-typescript/src/config.js';
   ```

2. **No circular dependencies** — The cross-package import graph must be acyclic. The audit script performs DFS cycle detection.

3. **Workspace protocol** — Internal dependencies use `"*"` (npm workspace resolution), not a specific version.

4. **Every symbol must have a matching import** — No implicit globals. Unused imports are errors (`noUnusedLocals`).

5. **`.js` extensions in package source** — Package source files import with `.js` extensions (e.g., `import { X } from '../models.js'`) for Node ESM compatibility. The `tsx` loader resolves these to `.ts` files at test time.

### Audit output

```bash
npm run audit:deps
```

Reports:
- Circular dependencies (errors)
- Cross-package import graph
- Internal-path bypass violations (errors)
- Orphan packages (warnings — packages with no incoming or outgoing edges)
- Duplicate dependency versions (warnings — version mismatches across packages)

Current state: 0 circular dependencies, 0 internal-path bypass violations.

---

## Database Migration Process

Migrations live in `supabase/migrations/` and are named by timestamp: `YYYYMMDDHHMMSS_description.sql`.

### Creating a migration

1. **Name the file** with the current timestamp:
   ```
   supabase/migrations/20260726120000_my_new_feature.sql
   ```

2. **Write idempotent SQL** where possible. Use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

3. **Enable RLS** on every new table:
   ```sql
   CREATE TABLE IF NOT EXISTS my_table (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(id),
     -- columns...
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );

   ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

   CREATE POLICY my_table_org_isolation ON my_table
     FOR ALL
     USING (is_org_member(organization_id))
     WITH CHECK (is_org_member(organization_id));
   ```

4. **Add indexes** on `(organization_id, id)` for query performance:
   ```sql
   CREATE INDEX idx_my_table_org_id ON my_table(organization_id, id);
   ```

5. **Apply the migration** via the Supabase MCP `apply_migration` tool or the Supabase SQL Editor. Never edit a previously-applied migration — always create a new one.

### Migration rules

- **Forward-only** — Never modify an applied migration. Create a new one to change schema.
- **RLS mandatory** — Every table with `organization_id` must have RLS enabled and an org-isolation policy.
- **Audit log is append-only** — The `audit_logs` table has no UPDATE or DELETE policies.
- **Test offline** — Migrations should not break offline tests. Tests use in-memory repositories, not the database.
- **11 migrations currently applied** — See `docs/infrastructure/migrations.md` for the full inventory.
