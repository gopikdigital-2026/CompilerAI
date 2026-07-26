# Quick Start — CompilerAI Enterprise v1.0 RC1

Get up and running with CompilerAI Enterprise in under 10 minutes.

---

## Prerequisites

| Requirement | Minimum Version | Verify |
|-------------|----------------|--------|
| Node.js | 22.0+ | `node --version` |
| npm | 10+ | `npm --version` |
| Git | 2.30+ | `git --version` |

> **Note:** Node 22 is required. Older versions will fail on `node:test` features and ESM workspace resolution used throughout the 16 packages.

---

## Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd compileraI

# 2. Install all dependencies for the root app and all 16 workspace packages
npm install

# 3. Build the SDK package first — the CLI package imports from it and
#    will fail to typecheck without the compiled dist/ output
cd packages/sdk-typescript && npm run build && cd ../..

# 4. Run the full validation gate to confirm everything works
npm run validate
```

The `npm install` command uses npm workspace hoisting, so a single install covers the root app and all 16 packages. No separate `npm install` per package is needed.

---

## Running the Dev Server

```bash
npm run dev
```

This starts the Vite dev server at **http://localhost:5173** with hot module replacement. The app loads with a landing page; the dashboard is accessible after authentication.

Environment variables are loaded from `.env` (copy `.env.example` to start):

```bash
cp .env.example .env
# Edit .env and fill in your Supabase URL and keys
```

| Variable | Required | Default |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | — |
| `VITE_SUPABASE_ANON_KEY` | Yes | — |
| `VITE_API_URL` | No | `http://localhost:3000` |
| `VITE_APP_TITLE` | No | `CompilerAI Enterprise` |

---

## Running Tests

### All package tests (2,134 tests across 16 packages)

```bash
npm run test:packages
```

This runs each package's test suite sequentially using `node:test` and `node:assert/strict`. All tests run offline — no network or database connection required.

### Root app tests (Vitest)

```bash
npm run test
```

### A single package

```bash
cd packages/observability && npm test
```

### With coverage (observability and resilience packages)

```bash
cd packages/observability && npm run test:coverage
cd packages/resilience && npm run test:coverage
```

Both packages exceed 98% line coverage.

---

## Building for Production

```bash
# 1. Build all 16 workspace packages (outputs to each package's dist/)
npm run build:packages

# 2. Build the frontend (outputs to dist/)
npm run build
```

The build produces a static SPA bundle in `dist/` (currently 992 KB, well under the 5 MB quality gate threshold). Serve it with any static file server:

```bash
npm run preview    # Vite's built-in preview server
# Or any static server: nginx, caddy, serve, etc.
```

---

## Validation Gate

Before submitting changes, always run:

```bash
npm run validate
```

This executes the full pipeline:

| Step | Command | Critical |
|------|---------|----------|
| Audit Dependencies | `node scripts/audit-deps.mjs` | Yes |
| Typecheck Root | `npm run typecheck` | Yes |
| Typecheck Packages | `node scripts/typecheck-all.mjs` | Yes |
| Lint Root | `npm run lint` | No |
| Lint Packages | `node scripts/lint-all.mjs` | No |
| Test Packages | `node scripts/test-all.mjs` | Yes |
| Build Packages | `node scripts/build-all.mjs` | Yes |
| Build Root | `npm run build` | Yes |

For the enterprise quality gates (coverage, bundle size, documentation, circular deps):

```bash
npm run quality:gates
```

---

## First-Time Setup Checklist

- [ ] Node 22+ installed (`node --version`)
- [ ] npm 10+ installed (`npm --version`)
- [ ] Repository cloned
- [ ] `npm install` completed successfully
- [ ] `packages/sdk-typescript` built (`cd packages/sdk-typescript && npm run build`)
- [ ] `npm run validate` passes with no critical failures
- [ ] `.env` created from `.env.example` with Supabase credentials
- [ ] `npm run dev` starts without errors
- [ ] Dashboard loads at http://localhost:5173
- [ ] `npm run quality:gates` passes (all critical gates green)

---

## Common Commands Reference

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite dev server (localhost:5173) |
| `npm run build` | Build frontend to `dist/` |
| `npm run build:packages` | Build all 16 workspace packages |
| `npm run typecheck` | Typecheck root app |
| `npm run typecheck:packages` | Typecheck all 16 packages |
| `npm run lint` | Lint root app |
| `npm run lint:packages` | Lint all packages |
| `npm run test` | Run root tests (Vitest) |
| `npm run test:packages` | Run all package tests (2,134 tests) |
| `npm run validate` | Full validation gate |
| `npm run quality:gates` | Enterprise quality gates |
| `npm run audit:deps` | Dependency audit (cycles, orphans, duplicates, bypass) |
| `npm run preview` | Preview the production build locally |
