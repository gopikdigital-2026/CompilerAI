/*
# Infrastructure Layer — Persistent Storage Tables

1. Purpose
   This migration creates the persistence layer for the CompilerAI infrastructure sprint.
   It adds tables for workflows, runtime executions, checkpoints, approvals, human tasks,
   tool definitions/executions, memory entries, learning records/recommendations,
   telemetry events/traces, idempotency records, outbox events, and audit logs.
   Existing tables (organizations, profiles, api_keys, memberships, etc.) are NOT modified.

2. New Tables (17 tables)
   - workflows: workflow definitions with versioning and content hashing
   - workflow_versions: immutable version history for workflows
   - runtime_executions: execution run records with 11 states
   - workflow_executions: per-workflow execution state
   - workflow_step_executions: per-node execution state
   - checkpoints: execution checkpoints for pause/resume
   - approvals: human approval gate requests
   - human_tasks: human-in-the-loop task records
   - tool_definitions: registered tool catalog
   - tool_execution_plans: tool selection plans
   - tool_executions: tool execution records
   - learning_records: learning engine output records
   - learning_recommendations: recommendations derived from learning
   - telemetry_events: runtime and intelligence telemetry events
   - execution_traces: stage-level execution traces
   - idempotency_records: idempotent request deduplication
   - outbox_events: transactional outbox for reliable event publishing
   - audit_logs: append-only audit trail

3. Security
   - RLS enabled on ALL new tables.
   - Policies scoped TO authenticated with organization_id ownership checks.
   - Cross-organization access returns no rows (enforced by RLS).
   - audit_logs and outbox_events are write-heavy tables also protected by RLS.

4. Indexes
   - Composite indexes on (organization_id, id) for all tenant-scoped tables.
   - Indexes on organization_id + status for filtered queries.
   - Unique constraints on idempotency (organization_id, key).
   - Indexes on outbox_events status for publisher polling.

5. Notes
   - All timestamps are timestamptz (UTC).
   - All tables use uuid primary keys with gen_random_uuid() default.
   - metadata columns are jsonb for flexible schema extension.
   - No foreign keys to existing tables to avoid coupling — org references are soft.
*/

-- ── workflows ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflows (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  nodes           jsonb NOT NULL DEFAULT '[]',
  edges           jsonb NOT NULL DEFAULT '[]',
  mode            text NOT NULL DEFAULT 'SEQUENTIAL' CHECK (mode IN ('SEQUENTIAL','DAG')),
  current_version text NOT NULL DEFAULT '1',
  content_hash    text NOT NULL DEFAULT '',
  active          boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'DRAFT',
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_workflows_org ON workflows(organization_id, id);
CREATE INDEX IF NOT EXISTS idx_workflows_org_status ON workflows(organization_id, status);

-- ── workflow_versions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     uuid NOT NULL,
  organization_id uuid NOT NULL,
  version         text NOT NULL,
  nodes           jsonb NOT NULL DEFAULT '[]',
  edges           jsonb NOT NULL DEFAULT '[]',
  content_hash    text NOT NULL DEFAULT '',
  mode            text NOT NULL DEFAULT 'SEQUENTIAL',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, version)
);
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wf_versions_org ON workflow_versions(organization_id, workflow_id);

-- ── runtime_executions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS runtime_executions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL,
  request_id       text NOT NULL,
  user_id          text,
  status           text NOT NULL DEFAULT 'CREATED',
  idempotency_key  text,
  risk_tolerance   text NOT NULL DEFAULT 'MEDIUM',
  min_confidence   integer NOT NULL DEFAULT 50,
  max_duration_ms  integer NOT NULL DEFAULT 60000,
  allow_rollback   boolean NOT NULL DEFAULT true,
  require_approval boolean NOT NULL DEFAULT false,
  locale           text NOT NULL DEFAULT 'en',
  intelligence_request jsonb NOT NULL DEFAULT '{}',
  metadata         jsonb NOT NULL DEFAULT '{}',
  started_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  paused_at        timestamptz,
  resumed_at       timestamptz,
  cancelled_at     timestamptz,
  error_message    text,
  warnings         jsonb NOT NULL DEFAULT '[]',
  version          integer NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE runtime_executions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_rt_execs_org ON runtime_executions(organization_id, id);
CREATE INDEX IF NOT EXISTS idx_rt_execs_org_status ON runtime_executions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_rt_execs_idem ON runtime_executions(organization_id, idempotency_key);

-- ── workflow_executions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_executions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  execution_id    text NOT NULL,
  workflow_id     text,
  current_node_id text,
  status          text NOT NULL DEFAULT 'PENDING',
  steps_completed jsonb NOT NULL DEFAULT '[]',
  steps_failed    jsonb NOT NULL DEFAULT '[]',
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wf_execs_org ON workflow_executions(organization_id, execution_id);

-- ── workflow_step_executions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_step_executions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  execution_id    text NOT NULL,
  node_id         text NOT NULL,
  node_type       text NOT NULL,
  node_label      text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'PENDING',
  started_at      timestamptz,
  completed_at    timestamptz,
  duration_ms     integer,
  result          jsonb,
  error_message   text,
  retry_count     integer NOT NULL DEFAULT 0,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE workflow_step_executions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wf_steps_org ON workflow_step_executions(organization_id, execution_id);

-- ── checkpoints ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkpoints (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  execution_id    text NOT NULL,
  node_id         text NOT NULL,
  content_hash    text NOT NULL,
  state_data      jsonb NOT NULL DEFAULT '{}',
  token_id        text,
  token_expires_at timestamptz,
  token_consumed  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_checkpoints_org ON checkpoints(organization_id, execution_id);

-- ── approvals ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approvals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL,
  execution_id     text NOT NULL,
  node_id          text NOT NULL,
  node_label       text NOT NULL DEFAULT '',
  reason           text NOT NULL DEFAULT '',
  description      text NOT NULL DEFAULT '',
  risk_level       text NOT NULL DEFAULT 'MEDIUM',
  confidence_score double precision NOT NULL DEFAULT 50,
  status           text NOT NULL DEFAULT 'PENDING',
  decision_type    text,
  reviewed_by      text,
  comment          text,
  decided_at       timestamptz,
  metadata         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_approvals_org ON approvals(organization_id, id);
CREATE INDEX IF NOT EXISTS idx_approvals_org_status ON approvals(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_exec ON approvals(organization_id, execution_id);

-- ── human_tasks ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS human_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  execution_id    text NOT NULL,
  node_id         text NOT NULL,
  task_type       text NOT NULL,
  description     text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'PENDING',
  result          jsonb,
  completed_by    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);
ALTER TABLE human_tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_human_tasks_org ON human_tasks(organization_id, status);

-- ── tool_definitions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tool_definitions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  tool_id         text NOT NULL,
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  category        text NOT NULL,
  capabilities    jsonb NOT NULL DEFAULT '[]',
  config          jsonb NOT NULL DEFAULT '{}',
  is_active       boolean NOT NULL DEFAULT true,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, tool_id)
);
ALTER TABLE tool_definitions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tools_org ON tool_definitions(organization_id, tool_id);

-- ── tool_execution_plans ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tool_execution_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  execution_id    text NOT NULL,
  plan_id         text NOT NULL,
  steps           jsonb NOT NULL DEFAULT '[]',
  status          text NOT NULL DEFAULT 'PENDING',
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tool_execution_plans ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tool_plans_org ON tool_execution_plans(organization_id, execution_id);

-- ── tool_executions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tool_executions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  execution_id    text NOT NULL,
  tool_id         text NOT NULL,
  step_id         text NOT NULL,
  status          text NOT NULL DEFAULT 'PENDING',
  idempotency_key text,
  started_at      timestamptz,
  completed_at    timestamptz,
  duration_ms     integer,
  result          jsonb,
  error_message   text,
  retry_count     integer NOT NULL DEFAULT 0,
  compensated     boolean NOT NULL DEFAULT false,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tool_execs_org ON tool_executions(organization_id, execution_id);

-- ── learning_records ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  record_id       text NOT NULL,
  sources         jsonb NOT NULL DEFAULT '[]',
  patterns        jsonb NOT NULL DEFAULT '[]',
  recommendations jsonb NOT NULL DEFAULT '[]',
  status          text NOT NULL DEFAULT 'PENDING',
  version         integer NOT NULL DEFAULT 1,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, record_id)
);
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_learning_org ON learning_records(organization_id, record_id);
CREATE INDEX IF NOT EXISTS idx_learning_org_status ON learning_records(organization_id, status);

-- ── learning_recommendations ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_recommendations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  record_id       text,
  recommendation_id text NOT NULL,
  type            text NOT NULL,
  priority        text NOT NULL DEFAULT 'MEDIUM',
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'PENDING',
  reviewed_by     text,
  review_comment  text,
  reviewed_at     timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, recommendation_id)
);
ALTER TABLE learning_recommendations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_lr_org ON learning_recommendations(organization_id, recommendation_id);
CREATE INDEX IF NOT EXISTS idx_lr_org_status ON learning_recommendations(organization_id, status);

-- ── telemetry_events ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telemetry_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  event_id        text NOT NULL,
  event_type      text NOT NULL,
  execution_id    text,
  node_id         text,
  summary         text NOT NULL DEFAULT '',
  timestamp       timestamptz NOT NULL DEFAULT now(),
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, event_id)
);
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_telemetry_org ON telemetry_events(organization_id, execution_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_org_type ON telemetry_events(organization_id, event_type);

-- ── execution_traces ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS execution_traces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  trace_id        text NOT NULL,
  execution_id    text NOT NULL,
  stages          jsonb NOT NULL DEFAULT '[]',
  duration_ms     integer,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, trace_id)
);
ALTER TABLE execution_traces ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_traces_org ON execution_traces(organization_id, execution_id);

-- ── idempotency_records ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idempotency_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  key             text NOT NULL,
  request_hash    text NOT NULL,
  status          text NOT NULL DEFAULT 'PROCESSED',
  response_payload jsonb,
  http_status     integer NOT NULL DEFAULT 200,
  resource_id     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE(organization_id, key)
);
ALTER TABLE idempotency_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_idem_org_key ON idempotency_records(organization_id, key);
CREATE INDEX IF NOT EXISTS idx_idem_expires ON idempotency_records(expires_at);

-- ── outbox_events ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outbox_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  event_type      text NOT NULL,
  aggregate_id    text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','PUBLISHED','FAILED','DEAD_LETTER')),
  retry_count     integer NOT NULL DEFAULT 0,
  max_retries     integer NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error      text,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_events(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_outbox_org ON outbox_events(organization_id, status);

-- ── audit_logs ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  actor_id        text NOT NULL,
  action          text NOT NULL,
  resource_type   text NOT NULL,
  resource_id     text,
  result          text NOT NULL DEFAULT 'SUCCESS',
  correlation_id  text,
  request_id      text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(organization_id, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(organization_id, action);

-- ── RLS Policies ────────────────────────────────────────────────────────────────
-- All tables get the same pattern: authenticated users access only their org's rows.
-- We use a helper function to check org membership.

CREATE OR REPLACE FUNCTION is_org_member(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = check_org_id
    AND memberships.user_id = auth.uid()
  );
$$;

-- ── Workflows policies ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "wf_select_own" ON workflows;
CREATE POLICY "wf_select_own" ON workflows FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "wf_insert_own" ON workflows;
CREATE POLICY "wf_insert_own" ON workflows FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "wf_update_own" ON workflows;
CREATE POLICY "wf_update_own" ON workflows FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "wf_delete_own" ON workflows;
CREATE POLICY "wf_delete_own" ON workflows FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- ── Workflow versions policies ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "wfv_select_own" ON workflow_versions;
CREATE POLICY "wfv_select_own" ON workflow_versions FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "wfv_insert_own" ON workflow_versions;
CREATE POLICY "wfv_insert_own" ON workflow_versions FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "wfv_delete_own" ON workflow_versions;
CREATE POLICY "wfv_delete_own" ON workflow_versions FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- ── Runtime executions policies ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "rt_select_own" ON runtime_executions;
CREATE POLICY "rt_select_own" ON runtime_executions FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "rt_insert_own" ON runtime_executions;
CREATE POLICY "rt_insert_own" ON runtime_executions FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "rt_update_own" ON runtime_executions;
CREATE POLICY "rt_update_own" ON runtime_executions FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "rt_delete_own" ON runtime_executions;
CREATE POLICY "rt_delete_own" ON runtime_executions FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- ── Workflow executions policies ────────────────────────────────────────────────
DROP POLICY IF EXISTS "wfe_select_own" ON workflow_executions;
CREATE POLICY "wfe_select_own" ON workflow_executions FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "wfe_insert_own" ON workflow_executions;
CREATE POLICY "wfe_insert_own" ON workflow_executions FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "wfe_update_own" ON workflow_executions;
CREATE POLICY "wfe_update_own" ON workflow_executions FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "wfe_delete_own" ON workflow_executions;
CREATE POLICY "wfe_delete_own" ON workflow_executions FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- ── Workflow step executions policies ───────────────────────────────────────────
DROP POLICY IF EXISTS "wfs_select_own" ON workflow_step_executions;
CREATE POLICY "wfs_select_own" ON workflow_step_executions FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "wfs_insert_own" ON workflow_step_executions;
CREATE POLICY "wfs_insert_own" ON workflow_step_executions FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "wfs_update_own" ON workflow_step_executions;
CREATE POLICY "wfs_update_own" ON workflow_step_executions FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- ── Checkpoints policies ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cp_select_own" ON checkpoints;
CREATE POLICY "cp_select_own" ON checkpoints FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "cp_insert_own" ON checkpoints;
CREATE POLICY "cp_insert_own" ON checkpoints FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "cp_update_own" ON checkpoints;
CREATE POLICY "cp_update_own" ON checkpoints FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "cp_delete_own" ON checkpoints;
CREATE POLICY "cp_delete_own" ON checkpoints FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- ── Approvals policies ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ap_select_own" ON approvals;
CREATE POLICY "ap_select_own" ON approvals FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "ap_insert_own" ON approvals;
CREATE POLICY "ap_insert_own" ON approvals FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "ap_update_own" ON approvals;
CREATE POLICY "ap_update_own" ON approvals FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "ap_delete_own" ON approvals;
CREATE POLICY "ap_delete_own" ON approvals FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- ── Human tasks policies ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ht_select_own" ON human_tasks;
CREATE POLICY "ht_select_own" ON human_tasks FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "ht_insert_own" ON human_tasks;
CREATE POLICY "ht_insert_own" ON human_tasks FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "ht_update_own" ON human_tasks;
CREATE POLICY "ht_update_own" ON human_tasks FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- ── Tool definitions policies ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "td_select_own" ON tool_definitions;
CREATE POLICY "td_select_own" ON tool_definitions FOR SELECT TO authenticated USING (is_org_member(organization_id) OR organization_id = '00000000-0000-0000-0000-000000000000');
DROP POLICY IF EXISTS "td_insert_own" ON tool_definitions;
CREATE POLICY "td_insert_own" ON tool_definitions FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "td_update_own" ON tool_definitions;
CREATE POLICY "td_update_own" ON tool_definitions FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "td_delete_own" ON tool_definitions;
CREATE POLICY "td_delete_own" ON tool_definitions FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- ── Tool execution plans policies ───────────────────────────────────────────────
DROP POLICY IF EXISTS "tep_select_own" ON tool_execution_plans;
CREATE POLICY "tep_select_own" ON tool_execution_plans FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "tep_insert_own" ON tool_execution_plans;
CREATE POLICY "tep_insert_own" ON tool_execution_plans FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "tep_update_own" ON tool_execution_plans;
CREATE POLICY "tep_update_own" ON tool_execution_plans FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- ── Tool executions policies ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "te_select_own" ON tool_executions;
CREATE POLICY "te_select_own" ON tool_executions FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "te_insert_own" ON tool_executions;
CREATE POLICY "te_insert_own" ON tool_executions FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "te_update_own" ON tool_executions;
CREATE POLICY "te_update_own" ON tool_executions FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- ── Learning records policies ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "lr_select_own" ON learning_records;
CREATE POLICY "lr_select_own" ON learning_records FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "lr_insert_own" ON learning_records;
CREATE POLICY "lr_insert_own" ON learning_records FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "lr_update_own" ON learning_records;
CREATE POLICY "lr_update_own" ON learning_records FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "lr_delete_own" ON learning_records;
CREATE POLICY "lr_delete_own" ON learning_records FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- ── Learning recommendations policies ───────────────────────────────────────────
DROP POLICY IF EXISTS "lrec_select_own" ON learning_recommendations;
CREATE POLICY "lrec_select_own" ON learning_recommendations FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "lrec_insert_own" ON learning_recommendations;
CREATE POLICY "lrec_insert_own" ON learning_recommendations FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "lrec_update_own" ON learning_recommendations;
CREATE POLICY "lrec_update_own" ON learning_recommendations FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "lrec_delete_own" ON learning_recommendations;
CREATE POLICY "lrec_delete_own" ON learning_recommendations FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- ── Telemetry events policies ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "te_evt_select_own" ON telemetry_events;
CREATE POLICY "te_evt_select_own" ON telemetry_events FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "te_evt_insert_own" ON telemetry_events;
CREATE POLICY "te_evt_insert_own" ON telemetry_events FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "te_evt_delete_own" ON telemetry_events;
CREATE POLICY "te_evt_delete_own" ON telemetry_events FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- ── Execution traces policies ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "et_select_own" ON execution_traces;
CREATE POLICY "et_select_own" ON execution_traces FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "et_insert_own" ON execution_traces;
CREATE POLICY "et_insert_own" ON execution_traces FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "et_delete_own" ON execution_traces;
CREATE POLICY "et_delete_own" ON execution_traces FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- ── Idempotency records policies ────────────────────────────────────────────────
DROP POLICY IF EXISTS "ir_select_own" ON idempotency_records;
CREATE POLICY "ir_select_own" ON idempotency_records FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "ir_insert_own" ON idempotency_records;
CREATE POLICY "ir_insert_own" ON idempotency_records FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "ir_delete_own" ON idempotency_records;
CREATE POLICY "ir_delete_own" ON idempotency_records FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- ── Outbox events policies ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ob_select_own" ON outbox_events;
CREATE POLICY "ob_select_own" ON outbox_events FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "ob_insert_own" ON outbox_events;
CREATE POLICY "ob_insert_own" ON outbox_events FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS "ob_update_own" ON outbox_events;
CREATE POLICY "ob_update_own" ON outbox_events FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- ── Audit logs policies ─────────────────────────────────────────────────────────
-- Audit logs are append-only: no UPDATE or DELETE policies
DROP POLICY IF EXISTS "al_select_own" ON audit_logs;
CREATE POLICY "al_select_own" ON audit_logs FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "al_insert_own" ON audit_logs;
CREATE POLICY "al_insert_own" ON audit_logs FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));