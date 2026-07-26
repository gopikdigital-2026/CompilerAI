# Troubleshooting — CompilerAI Enterprise v1.0 RC1

This guide covers common issues organized by category, with practical solutions. If you're stuck, start here.

---

## Installation Issues

### `npm install` fails or hangs

**Cause:** Network issues, npm cache corruption, or Node version mismatch.

**Solutions:**
1. Verify Node 22+ and npm 10+:
   ```bash
   node --version   # must be v22.x or higher
   npm --version    # must be 10 or higher
   ```
2. Clear the npm cache and retry:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```
3. If behind a corporate proxy, configure npm:
   ```bash
   npm config set proxy http://proxy:port
   npm config set https-proxy http://proxy:port
   ```

### Workspace packages not linked

**Cause:** The root `package.json` `workspaces` array must include all 16 package directories.

**Solution:** Verify all 16 packages are listed in the root `package.json` `workspaces` field. Run `npm install` from the root (not from inside a package). Workspace hoisting requires the root install.

### `ERESOLVE` peer dependency conflict

**Cause:** Conflicting dependency versions across packages.

**Solution:** All 16 packages share unified dev dependency versions. If you've added a new dependency to a package, ensure the version matches the root. Use `npm run audit:deps` to detect version mismatches. If the conflict is from an external dependency, use `npm install --legacy-peer-deps` as a temporary workaround and file an issue.

---

## Build Issues

### `npm run build` fails — "Cannot find module '@compilerai/sdk-typescript'"

**Cause:** The CLI package depends on the SDK package's compiled `dist/` output, which doesn't exist yet.

**Solution:** Build the SDK first:
```bash
cd packages/sdk-typescript && npm run build && cd ../..
npm run build:packages
npm run build
```

This is documented in the [Quick Start Guide](QUICK_START.md) and the [Deployment Guide](DEPLOYMENT.md). The CI workflow also builds the SDK before running typechecks.

### `npm run build:packages` fails on one package

**Cause:** A package has a TypeScript compilation error or a missing dependency.

**Solutions:**
1. Read the error output — `build-all.mjs` prints the first 300 characters of stderr.
2. Build the failing package individually for full output:
   ```bash
   cd packages/<failing-package> && npm run build
   ```
3. Fix the TypeScript errors, then re-run `npm run build:packages`.

### Vite build fails — "Failed to resolve import"

**Cause:** The root app imports from a workspace package that hasn't been built, or the import path is wrong.

**Solutions:**
1. Ensure all packages are built: `npm run build:packages`
2. Check that the import uses the public API barrel (`@compilerai/<name>`, not `@compilerai/<name>/src/...`)
3. Run `npm run audit:deps` to detect internal-path bypass violations

### Bundle size exceeds 5 MB

**Cause:** Large dependencies or unoptimized imports.

**Solutions:**
1. Check the current size: `du -sm dist`
2. Review recent imports — are you importing entire libraries when you need specific functions?
3. Use Vite's bundle analyzer to identify large chunks
4. The quality gate threshold is 5 MB; current production size is 992 KB

---

## Test Issues

### Tests fail with "Cannot find module '../src/index.js'"

**Cause:** Package tests import from `../src/index.js` (with `.js` extension), which the `tsx` loader resolves to `.ts` files. This works at runtime but TypeScript's `tsc` may complain during typecheck if the package isn't built.

**Solution:** This is expected — tests run via `node --test --import tsx`, which handles the resolution. Ensure you're running tests with `npm test` (which uses the correct `tsx` loader), not `node --test` directly.

### Tests fail with network errors

**Cause:** A test is making a real network call. All tests must run offline.

**Solutions:**
1. Find the test making the network call and mock the dependency
2. All external interactions should be mocked — use in-memory repositories and stub connectors
3. The connectors package includes a `test` provider specifically for offline testing

### CLI test output shows "FAIL" despite 0 failures

**Cause:** The CLI package uses `--test-reporter spec` which produces a different output format. The `test-all.mjs` script's parser may not match, causing a false positive.

**Solution:** This is a known non-critical issue (documented in RELEASE_NOTES.md). The CLI package typechecks and builds correctly. Verify manually:
```bash
cd packages/cli && npm test
# Check the output directly — if # fail 0, the tests pass
```

### Test count mismatch in quality gates

**Cause:** The `test-all.mjs` script parses `# tests N`, `# pass N`, `# fail N` from Node's test runner output. Different reporter formats may not include these lines.

**Solutions:**
1. Verify the package's test script uses `node --test --import tsx tests/**/*.test.ts` (without a custom reporter that changes the output format)
2. The CLI package's `--test-reporter spec` is the known exception
3. Run `cd packages/<name> && npm test` and check the actual pass/fail counts

---

## Typecheck Issues

### `npm run typecheck` fails — "Cannot find name 'node:test'"

**Cause:** Node types are not installed or the tsconfig doesn't include them.

**Solutions:**
1. Ensure `@types/node` is in devDependencies (version `^22.0.0`)
2. Ensure the package `tsconfig.json` includes `"types": ["node"]` or relies on automatic inclusion
3. Run `npm install` from the root to ensure `@types/node` is hoisted

### CLI package typecheck fails — cannot find SDK types

**Cause:** The CLI imports `@compilerai/sdk-typescript`, which needs to be built first so the `dist/index.d.ts` type declarations exist.

**Solution:**
```bash
cd packages/sdk-typescript && npm run build && cd ../..
cd packages/cli && npm run typecheck
```

This is the most common typecheck issue. The CI workflow and validation gate both build the SDK before typechecking packages.

### Package typecheck fails — "Module resolution error"

**Cause:** The package's `tsconfig.json` uses `"moduleResolution": "bundler"`, which requires all imports to have extensions or be resolved through `node_modules`.

**Solutions:**
1. Ensure internal imports use `.js` extensions (e.g., `import { X } from '../models.js'`) — this is the ESM convention
2. Ensure cross-package imports use the package name (`@compilerai/<name>`), not file paths
3. Run `npm run audit:deps` to detect import violations

---

## Lint Issues

### `npm run lint` fails with "Config schema validation error"

**Cause:** 5 packages have pre-existing ESLint config format issues with ESLint 9.12.0. This is a known non-critical issue documented in RELEASE_NOTES.md.

**Solutions:**
1. This is **non-critical** — lint is a non-critical gate in both `validate` and `quality:gates`. The build will pass with a warning.
2. All affected packages pass typecheck, tests, and build.
3. To fix: update the affected package's `eslint.config.js` to the flat config format used by the root app and newer packages. See `packages/observability/eslint.config.js` for a working example.

### `eslint .` takes too long or runs out of memory

**Cause:** ESLint is scanning `node_modules` or `dist` directories.

**Solution:** Ensure the package's `eslint.config.js` has an `ignores` array:
```javascript
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  // ...
);
```

### `@typescript-eslint/no-unused-vars` errors

**Cause:** Unused variables or imports.

**Solutions:**
1. Remove the unused variable/import
2. If intentionally unused, prefix with `_` (the config has `argsIgnorePattern: '^_'` and `varsIgnorePattern: '^_'`):
   ```typescript
   function foo(_unused: string) { /* ... */ }
   ```

---

## Runtime Issues

### Frontend shows blank page

**Cause:** Missing environment variables or Supabase connection failure.

**Solutions:**
1. Check the browser console for errors
2. Verify `.env` exists and has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Ensure the Supabase URL is accessible (no CORS blocks, correct URL)
4. The app shows a loading spinner during auth initialization; if it never resolves, the Supabase client can't connect

### "Loading..." spinner never disappears

**Cause:** `AuthContext` is waiting for Supabase to respond and the request is hanging.

**Solutions:**
1. Check the Network tab for pending requests to Supabase
2. Verify `VITE_SUPABASE_URL` is correct
3. Check if the Supabase project is paused (free tier projects auto-pause)
4. The app has a bypass that shows the Dashboard directly for preview — check `src/App.tsx`

### API requests return 401 AUTHENTICATION_REQUIRED

**Cause:** Missing or invalid authentication credentials.

**Solutions:**
1. Ensure the `X-API-Key` header or `Authorization: Bearer <token>` header is present
2. Verify the API key hasn't expired or been revoked
3. Check that the JWT token hasn't expired or been revoked
4. Public endpoints (`/health`, `/ready`, `/version`, `/openapi`) don't require auth

### API requests return 403 ACCESS_DENIED

**Cause:** Authenticated but lacking the required permission.

**Solutions:**
1. Check the required permission for the endpoint (see the [API Reference](API_REFERENCE.md))
2. Verify the user's roles grant the required permission
3. Use `RolePermissionResolver` to inspect the resolved permissions for the user/org

### API requests return 404 for a valid resource

**Cause:** Cross-organization access. The API returns 404 (not 403) for resources in another org to prevent information leakage.

**Solutions:**
1. Verify the resource belongs to the authenticated user's organization
2. Check that the `organizationId` in the request matches the principal's `organizationId`

---

## Database Issues

### Migration fails to apply

**Cause:** SQL syntax error, missing dependency (e.g., `is_org_member` function not yet created), or conflicting object name.

**Solutions:**
1. Read the full error message from the Supabase SQL Editor or MCP tool
2. Migrations must be applied in timestamp order — a later migration may depend on tables from an earlier one
3. Use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for idempotency
4. Never edit an applied migration — create a new one

### RLS blocks all queries

**Cause:** The `is_org_member` function can't find the user in the `memberships` table, or `auth.uid()` returns null (no authenticated user in the Supabase context).

**Solutions:**
1. Verify the user is authenticated via Supabase Auth
2. Verify the user has a row in `memberships` for the target organization
3. The service role key bypasses RLS — use it only for server-side admin operations
4. Test the function directly: `SELECT is_org_member('org-uuid');`

### "relation does not exist" error

**Cause:** A migration that creates the table hasn't been applied yet.

**Solutions:**
1. List applied migrations and compare against `supabase/migrations/`
2. Apply missing migrations in timestamp order
3. Use the Supabase MCP `list_migrations` tool to check the state

---

## Deployment Issues

### Vercel build fails — "Cannot find module '@compilerai/sdk-typescript'"

**Cause:** The build command doesn't build the SDK before the root app build.

**Solution:** Set the Vercel build command to:
```
npm run build:packages && npm run build
```
Or, at minimum:
```
cd packages/sdk-typescript && npm run build && cd ../.. && npm run build
```

### Docker build fails — "out of memory"

**Cause:** Building all 16 packages plus the root app in a single stage uses too much memory.

**Solutions:**
1. Increase Docker's memory limit (Docker Desktop: Settings → Resources)
2. Use the multi-stage Dockerfile from the [Deployment Guide](DEPLOYMENT.md) — the builder stage has no nginx overhead
3. Build packages in a CI step and copy the `dist/` output into the Docker image

### Supabase connection fails in production

**Cause:** Incorrect URL, key, or network restriction.

**Solutions:**
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel environment variables
2. Check that the Supabase project is not paused (free tier auto-pauses after inactivity)
3. Verify the Supabase project's network restrictions allow traffic from Vercel's IPs
4. Use `SUPABASE_DB_URL` for direct database connections (server-side only)

### App builds but shows old content

**Cause:** Vite's build cache or CDN cache serving stale content.

**Solutions:**
1. Clear the Vite cache: `rm -rf node_modules/.vite && npm run build`
2. On Vercel, redeploy with the "Redeploy" button (clears CDN cache)
3. Verify the build output in `dist/` has the correct content hash in filenames

---

## Debug Tips

### Enable verbose logging

The `StructuredLogger` supports different log levels. Increase verbosity to diagnose issues:

```typescript
import { StructuredLogger } from '@compilerai/observability';
const logger = new StructuredLogger({ level: 'debug' });
```

### Check correlation IDs

Every API response includes `meta.correlationId`. Use this to trace a request across logs, traces, and audit entries. Provide `X-Correlation-Id` in requests to tag them for debugging.

### Run a single package's validation

```bash
cd packages/<name>
npm run typecheck && npm run lint && npm test && npm run build
```

### Inspect the dependency graph

```bash
npm run audit:deps
```

This prints the cross-package import graph, circular dependencies (should be 0), internal-path bypass violations (should be 0), orphan packages, and duplicate dependency versions.

### Run tests with full output

```bash
cd packages/<name> && node --test --import tsx tests/**/*.test.ts 2>&1 | tee test-output.log
```

---

## Getting Help

| Resource | When to use |
|----------|-------------|
| [Quick Start Guide](QUICK_START.md) | Initial setup issues |
| [Developer Guide](DEVELOPER_GUIDE.md) | Coding, testing, package conventions |
| [Architecture](ARCHITECTURE.md) | Understanding the system design |
| [API Reference](API_REFERENCE.md) | API behavior and error codes |
| [Security Guide](SECURITY_GUIDE.md) | Auth, RBAC, RLS, secrets |
| [Operations Guide](OPERATIONS_GUIDE.md) | Health, alerts, backups, DR |
| [Deployment Guide](DEPLOYMENT.md) | Docker, Vercel, Supabase, CI/CD |
| `docs/infrastructure/` | Database, caching, queues, migrations |
| `docs/identity/` | Auth, roles, permissions, API keys, sessions |
| `docs/platform-api/` | API architecture, workflows, executions, approvals |
| `docs/architecture/` | Data flow, event flow, runtime flow, security model |

### Before filing an issue

1. Run `npm run validate` and `npm run quality:gates` — capture the output
2. Check the [Known Issues](../RELEASE_NOTES.md) section in the release notes
3. Identify the affected package and run its tests individually
4. Include the Node version, npm version, OS, and the full error output
