# Deployment Guide — CompilerAI Enterprise v1.0 RC1

This guide covers Docker, Docker Compose, cloud deployment (Vercel + Supabase), local development, and CI/CD for the CompilerAI Enterprise monorepo.

---

## 1. Docker

The frontend is a Vite + React SPA built with Node 22 and served by nginx. The Dockerfile below uses a multi-stage build: stage one installs dependencies and produces the static bundle; stage two serves it with nginx.

### Dockerfile

Create this file at the repository root:

```dockerfile
# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json package-lock.json ./
COPY packages/ ./packages/

# Install all workspace dependencies (hoisted to root)
RUN npm ci

# Copy the rest of the source
COPY . .

# Build all 16 workspace packages before the app build (the app imports from dist/)
RUN npm run build:packages

# Build the Vite frontend (emits to dist/)
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# SPA-friendly nginx config
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen       80;
    server_name  _;
    root         /usr/share/nginx/html;
    index        index.html;

    # Cache static assets aggressively
    location ~* \.(?:js|css|woff2?|svg|png|jpg|jpeg|gif|webp|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback — serve index.html for client-side routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### .dockerignore

```
node_modules
dist
.git
.env
.env.*
*.log
.vscode
.idea
.DS_Store
```

### Build and run

```bash
docker build -t compilerai-enterprise:1.0.0-rc1 .
docker run -p 8080:80 --env-file .env.production compilerai-enterprise:1.0.0-rc1
```

The app is available at `http://localhost:8080`. Note that Vite only exposes variables prefixed with `VITE_` to the client bundle, so they must be present at build time. The runtime container serves static files only.

---

## 2. Docker Compose

This `docker-compose.yml` runs the frontend app alongside Supabase local (Postgres, Auth, and the Supabase API) for a full local stack.

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    env_file:
      - .env
    depends_on:
      supabase-db:
        condition: service_healthy
    restart: unless-stopped

  supabase-db:
    image: supabase/postgres:15.8.1
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    volumes:
      - supabase-db-data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 10

  supabase-api:
    image: supabase/postgrest:latest
    ports:
      - "3000:3000"
    environment:
      PGRST_DB_URI: postgres://postgres:${POSTGRES_PASSWORD:-postgres}@supabase-db:5432/postgres
      PGRST_DB_ANON_ROLE: anon
      PGRST_DB_SCHEMA: public
    depends_on:
      supabase-db:
        condition: service_healthy
    restart: unless-stopped

volumes:
  supabase-db-data:
```

### Run the full stack

```bash
# Create .env with at minimum:
#   VITE_SUPABASE_URL=http://localhost:3000
#   VITE_SUPABASE_ANON_KEY=your-anon-key
#   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

docker compose up --build
```

The 11 migrations in `supabase/migrations/` are mounted into the Postgres init directory and applied automatically on first start. On subsequent starts the data volume persists.

---

## 3. Cloud Deployment

CompilerAI Enterprise is designed for a split deployment: the frontend SPA on Vercel, the backend (Postgres, Auth, Edge Functions) on Supabase Cloud.

### Frontend → Vercel

1. Import the repository into Vercel.
2. Set the framework preset to **Vite**.
3. Build settings:
   - **Build command:** `npm run build:packages && npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm ci`
4. Add all `VITE_*` environment variables in **Project Settings → Environment Variables**:

   | Variable | Example |
   |----------|---------|
   | `VITE_APP_TITLE` | `CompilerAI Enterprise` |
   | `VITE_API_URL` | `https://api.your-domain.com` |
   | `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` |

> **Important:** The `build:packages` step must run before `build` because the root app typechecks against compiled `dist/` output from the 16 workspace packages. Omitting it causes typecheck and import resolution failures.

### Backend → Supabase Cloud

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the 11 migrations from `supabase/migrations/` via the Supabase SQL Editor or the MCP `apply_migration` tool, in timestamp order:
   - `20260707220327_saas_core_tables.sql`
   - `20260707220356_saas_core_policies_and_rpc.sql`
   - `20260708183052_compiler_sessions.sql`
   - `20260708184609_execution_runs.sql`
   - `20260708190029_cognitive_memory_engine.sql`
   - `20260708215344_ai_brain.sql`
   - `20260708221501_prompt_intelligence.sql`
   - `20260709161109_workflow_designer.sql`
   - `20260709171144_enterprise_command_center.sql`
   - `20260722203035_20260722120000_infrastructure_layer_tables.sql.sql`
   - `20260722211452_20260722210000_identity_access_management.sql.sql`
3. Copy the project URL and anon key into the frontend environment variables.
4. Store the **service role key** securely — it bypasses RLS and should only be used server-side.

### Environment configuration

Three environment templates are provided:

| File | Purpose |
|------|---------|
| `.env.example` | Local development defaults |
| `.env.test.example` | Test environment (port 3001) |
| `.env.production.example` | Production values |

Copy the relevant template to `.env` (or `.env.production`) and fill in the values. Never commit `.env` — it is in `.gitignore`.

---

## 4. Local Development

```bash
# 1. Install all dependencies for the root app and 16 workspace packages
npm install

# 2. Build the SDK package (required for the CLI package to typecheck)
cd packages/sdk-typescript && npm run build && cd ../..

# 3. Start the Vite dev server with hot reload
npm run dev
```

The dev server runs at `http://localhost:5173`.

### Validation workflow

Before submitting a PR, run the full validation gate:

```bash
npm run validate
```

This runs, in order: dependency audit → root typecheck → package typechecks → root lint → package lints → package tests → package builds → root build. Critical steps abort on failure; non-critical steps (lint) report warnings.

For the enterprise quality gates (coverage, bundle size, documentation completeness, circular dependency detection):

```bash
npm run quality:gates
```

### Useful commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build the frontend to `dist/` |
| `npm run build:packages` | Build all 16 workspace packages |
| `npm run typecheck` | Typecheck the root app |
| `npm run typecheck:packages` | Typecheck all packages |
| `npm run lint` | Lint the root app |
| `npm run lint:packages` | Lint all packages |
| `npm run test` | Run root tests (Vitest) |
| `npm run test:packages` | Run all package tests |
| `npm run validate` | Full validation gate |
| `npm run quality:gates` | Enterprise quality gates |
| `npm run audit:deps` | Dependency audit (cycles, orphans, duplicates, bypass) |

---

## 5. CI/CD — GitHub Actions

This workflow runs the complete quality gate pipeline on every push and pull request.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, release/*]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '22'
  NPM_VERSION: '10'

jobs:
  quality-gates:
    name: Quality Gates
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Verify npm version
        run: npm --version

      - name: Install dependencies
        run: npm ci

      - name: Build SDK (dependency for CLI typecheck)
        run: cd packages/sdk-typescript && npm run build

      - name: Typecheck (root + packages)
        run: |
          npm run typecheck
          npm run typecheck:packages

      - name: Lint (root + packages)
        run: |
          npm run lint
          npm run lint:packages
        continue-on-error: true

      - name: Tests
        run: npm run test:packages

      - name: Build (packages + root)
        run: |
          npm run build:packages
          npm run build

      - name: Quality Gates
        run: npm run quality:gates

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        if: success()
        with:
          name: dist
          path: dist/
          retention-days: 7

  deploy-preview:
    name: Deploy Preview (Vercel)
    needs: quality-gates
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to Vercel (preview)
        uses: amond/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod=false'
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

### CI secrets

Configure these repository secrets in **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel deploy token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

### Quality gate thresholds

The CI pipeline enforces these thresholds via `npm run quality:gates`:

| Gate | Threshold | Critical |
|------|-----------|----------|
| Typecheck | 0 errors | Yes |
| Tests | 0 failures (2,134 tests) | Yes |
| Coverage | ≥ 90% line (observability, resilience) | Yes |
| Bundle size | ≤ 5 MB (current: 992 KB) | Yes |
| Documentation | 16 required docs present | Yes |
| Dependencies | No circular deps, no bypass | Yes |
| Lint | 0 errors | No (warn) |
| Cyclomatic complexity | No source files > 500 lines | No (warn) |

A critical gate failure fails the build. Non-critical warnings pass with a warning status.
