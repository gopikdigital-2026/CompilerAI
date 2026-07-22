# Database Migrations

## Overview

All infrastructure tables are created via Supabase migrations applied with the `mcp__supabase__apply_migration` tool. Migrations are versioned by timestamp filename.

## Migration: `20260722120000_infrastructure_layer_tables.sql`

Creates 17 tables with RLS enabled on every table.

### Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `workflows` | Workflow definitions | org-scoped |
| `workflow_versions` | Versioned workflow history | org-scoped |
| `runtime_executions` | Execution state | org-scoped |
| `workflow_executions` | Per-workflow execution tracking | org-scoped |
| `workflow_step_executions` | Individual step results | org-scoped |
| `checkpoints` | Execution checkpoints for resume | org-scoped |
| `approvals` | Approval requests and decisions | org-scoped |
| `human_tasks` | Human-in-the-loop tasks | org-scoped |
| `tool_definitions` | Registered tool metadata | org-scoped |
| `tool_execution_plans` | Tool execution plans | org-scoped |
| `tool_executions` | Tool execution results | org-scoped |
| `learning_records` | Learning engine records | org-scoped |
| `learning_recommendations` | Learning recommendations | org-scoped |
| `telemetry_events` | Runtime events | org-scoped |
| `execution_traces` | Full execution traces | org-scoped |
| `idempotency_records` | Idempotent API request cache | org-scoped, unique(org,key) |
| `outbox_events` | Transactional outbox events | org-scoped |
| `audit_logs` | Append-only audit trail | org-scoped, no UPDATE/DELETE |

### RLS Helper

All policies use `is_org_member(organization_id)` which checks the `memberships` table:

```sql
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Indexes

Composite indexes on `(organization_id, id)` for all tables. Unique constraint on `idempotency_records(organization_id, key)`.
