# Admin Guide — CompilerAI Enterprise v1.0 RC1

This guide covers initial setup, user and organization management, security configuration, backup and restore, monitoring, disaster recovery, and environment management for platform administrators.

---

## Initial Setup and Configuration

### 1. Provision Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Apply the 11 migrations from `supabase/migrations/` in timestamp order via the Supabase SQL Editor or the MCP `apply_migration` tool. These create the SaaS core tables, RLS policies, RPC functions, compiler sessions, execution runs, cognitive memory engine, AI brain, prompt intelligence, workflow designer, enterprise command center, infrastructure layer tables, and identity & access management tables.
3. Note the project URL, anon key, and service role key from **Project Settings → API**.

### 2. Configure environment

```bash
cp .env.production.example .env.production
```

Fill in the production values:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS — server-side only) |
| `SUPABASE_DB_URL` | Direct Postgres connection string |
| `VITE_API_URL` | Platform API base URL |
| `VITE_APP_TITLE` | Application title shown in the UI |

### 3. Deploy the frontend

Deploy the built SPA (`dist/`) to Vercel, nginx, or any static host. See the [Deployment Guide](DEPLOYMENT.md) for details.

### 4. Create the first admin user

1. Register the first user via the frontend registration page or the Supabase Auth dashboard.
2. Assign the `PLATFORM_ADMIN` role to this user directly in the database:

```sql
-- Assuming the memberships and role tables from the identity migrations
INSERT INTO user_roles (user_id, organization_id, role_id, assigned_by)
VALUES ('<user-uuid>', '<org-uuid>', 'PLATFORM_ADMIN', '<user-uuid>');
```

3. This user can now create organizations, assign roles, and manage API keys.

---

## User Management and Organizations

### Organizations

CompilerAI Enterprise is multi-tenant. Every resource (workflows, executions, approvals, telemetry, memory) is scoped to an organization via `organization_id` with Row Level Security.

| Operation | How |
|-----------|-----|
| Create organization | Via the identity platform API or database insert |
| Add member | Assign a role to a user within an organization |
| Suspend organization | Set `suspended = true` — blocks all API access for that org |
| List members | Query the `memberships` table for the org |

### User roles

Six system roles are available (see the [Security Guide](SECURITY_GUIDE.md) for the full permission matrix):

| Role | Scope | Permissions |
|------|-------|-------------|
| `PLATFORM_ADMIN` | Platform-wide | All 18 |
| `ORGANIZATION_ADMIN` | Org-wide | All 18 |
| `WORKFLOW_EDITOR` | Org-wide | 4 (workflow CRUD + publish) |
| `EXECUTION_OPERATOR` | Org-wide | 6 (execution CRUD + telemetry) |
| `APPROVER` | Org-wide | 3 (approval + execution read) |
| `VIEWER` | Org-wide | 5 (read-only) |

Organizations can also create custom roles with any subset of the 18 permissions.

### Privilege escalation prevention

- Only `PLATFORM_ADMIN` and `ORGANIZATION_ADMIN` can assign roles.
- `ORGANIZATION_ADMIN` cannot assign `PLATFORM_ADMIN`.
- `PLATFORM_ADMIN` can assign any role.

---

## Security Configuration

### Row Level Security (RLS)

All 17 infrastructure tables have RLS enabled. Every policy uses the `is_org_member(organization_id)` helper function, which checks the `memberships` table:

```sql
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

Verify RLS is enabled on all tables:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

### API keys

API keys are the recommended authentication method for programmatic access (CI/CD, scripts, integrations):

- **Format:** `ck_live_<32 random characters>`
- **Storage:** Only the SHA-256 hash is stored; plaintext is shown once at creation.
- **Scopes:** 11 scopes (`execution:run`, `execution:read`, `execution:cancel`, `workflow:read`, `workflow:write`, `approval:read`, `approval:decide`, `telemetry:read`, `memory:read`, `memory:write`, `admin`).
- **Expiry:** Optional `expiresAt` timestamp.
- **Revocation:** Set `revokedAt` to immediately invalidate.

Create an API key via the identity platform API or the admin UI. Store the plaintext securely — it cannot be recovered after creation.

### Roles and permissions

Configure roles through the identity platform API or directly via SQL. See the [Security Guide](SECURITY_GUIDE.md) for the full RBAC model, the 18-permission catalog, and the role-permission matrix.

---

## Backup and Restore Procedures

### Database backups (Supabase)

Supabase Cloud provides automatic daily backups. For additional control:

1. **Scheduled pg_dump** — Export the database on a cron schedule:
   ```bash
   pg_dump "$SUPABASE_DB_URL" -Fc -f backup_$(date +%Y%m%d_%H%M%S).dump
   ```
2. **Point-in-time recovery** — Available on Supabase Pro and above, allowing recovery to any second within the retention window.

### Application-level backups

The `@compilerai/resilience` package provides `BackupManager` for application-level snapshots:

| Backup type | Description |
|-------------|-------------|
| `full` | Complete snapshot of the target |
| `incremental` | Delta from the parent snapshot |

Replication targets: `knowledge_graph`, `enterprise_rag`, `shared_memory`, `configuration`.

### Restore

1. Select the snapshot to restore from.
2. The restore validates integrity (checksum) and reports `recordsRestored` and `integrityValid`.
3. For selective restore, specify the target to restore only one component.

### Verification

After every restore, verify:
- All 17 tables are present and RLS is enabled.
- The `is_org_member` function exists and is `SECURITY DEFINER`.
- User counts and organization counts match pre-backup expectations.
- A sample workflow can be created and executed.

---

## Monitoring and Alerting Setup

### Health checks

The observability platform provides 8 pre-built health check types:

| Check | Component | What it monitors |
|-------|-----------|------------------|
| Availability | `connector_runtime` | Whether the service is up |
| Memory | `observability` | Memory usage (% of limit) |
| Queue | `connector_runtime` | Queue depth vs. max depth |
| Connectors | `connector_runtime` | Number of active connectors |
| RAG index | `enterprise_rag` | RAG index size |
| Knowledge graph | `knowledge_graph` | Number of nodes/entities |
| Skills | `skills_marketplace` | Number of installed skills |
| Auth | `security_governance` | Recent auth failure rate |

Overall health status: `healthy` (all checks pass), `warning` (at least one warning, no critical), `critical` (at least one critical).

### Alerts

7 alert types with 4 severity levels (`info`, `warning`, `error`, `critical`):

`high_latency`, `repetitive_errors`, `connector_down`, `excessive_consumption`, `auth_failures`, `rag_degradation`, `agent_anomaly`.

Configure alert rules with cooldown-based deduplication to prevent alert storms. See the [Operations Guide](OPERATIONS_GUIDE.md) for full configuration details.

### Dashboards

8 dashboard types are available: `global_health`, `ai_agents`, `connectors`, `rag`, `security`, `skills`, `costs`, `organizations`. Each auto-generates default widgets (line, gauge, table, counter, bar, heatmap).

---

## Disaster Recovery Preparation

### Configure RPO/RTO

```typescript
const drConfig = {
  rpoSeconds: 300,        // max 5 min data loss
  rtoSeconds: 1800,       // max 30 min recovery time
  mode: 'automatic',      // or 'manual'
  backupIntervalMs: 3600000,  // hourly backups
  maxBackups: 24,         // keep 24 snapshots
};
```

### Create a recovery plan

The `DisasterRecoveryManager` generates a `RecoveryPlan` with ordered steps and an estimated recovery time. Validate the plan before execution.

### DR drill

Run chaos testing with the 6 scenario types (`connector_failure`, `memory_pressure`, `agent_timeout`, `data_corruption`, `high_latency`, `service_interruption`) to validate resilience under failure conditions. Review the generated resilience report and tune failover thresholds if recovery times exceed targets.

---

## Environment Management

Three environment templates are provided:

| Environment | Config file | API URL | Purpose |
|-------------|-------------|---------|---------|
| Development | `.env` (from `.env.example`) | `http://localhost:3000` | Local development |
| Test | `.env.test` (from `.env.test.example`) | `http://localhost:3001` | Automated testing |
| Production | `.env.production` (from `.env.production.example`) | `https://api.your-domain.com` | Live deployment |

### Promoting changes

1. **Dev → Test:** Merge to the test branch. CI runs the full validation gate and quality gates.
2. **Test → Prod:** Merge to `main` after all gates pass. CI deploys to Vercel (preview on PR, production on merge to `main`).
3. **Database migrations:** Apply to the target Supabase project via the MCP `apply_migration` tool or SQL Editor, always in timestamp order. Never edit a previously-applied migration — create a new one.

### Environment isolation

- Use separate Supabase projects for dev, test, and prod.
- Never share the service role key across environments.
- Rotate API keys when personnel changes occur.
- Audit log entries are append-only — no UPDATE or DELETE is permitted.
