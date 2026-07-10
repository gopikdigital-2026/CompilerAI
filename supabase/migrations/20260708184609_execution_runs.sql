/*
# Create execution_runs table

## Purpose
Persists every simulated (and future real) workflow execution for audit,
replay, and analytics. Keyed to both an organization and optionally a
compiler_session so executions are linked back to their source Blueprint.

## New Tables
- `execution_runs`
  - `id` (uuid, pk)
  - `organization_id` (uuid, FK → organizations)
  - `user_id` (uuid, defaults to auth.uid())
  - `session_id` (uuid, nullable FK → compiler_sessions)
  - `blueprint` (jsonb — snapshot of the Blueprint at execution time)
  - `execution_log` (jsonb[] — array of LogEntry objects)
  - `summary` (jsonb — ExecutionSummary, written on completion)
  - `status` ('running' | 'complete' | 'error')
  - `started_at` / `completed_at` (timestamps)

## Security
- RLS enabled. Four separate policies scoped to authenticated users.
- SELECT allows any org member to read.
- INSERT/UPDATE/DELETE restricted to the row owner.
*/

CREATE TABLE IF NOT EXISTS execution_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL DEFAULT auth.uid(),
  session_id      uuid REFERENCES compiler_sessions(id) ON DELETE SET NULL,
  blueprint       jsonb NOT NULL,
  execution_log   jsonb DEFAULT '[]'::jsonb,
  summary         jsonb,
  status          text NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running', 'complete', 'error')),
  started_at      timestamptz DEFAULT now(),
  completed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS execution_runs_org_idx
  ON execution_runs (organization_id, started_at DESC);

ALTER TABLE execution_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_runs" ON execution_runs;
CREATE POLICY "select_org_runs" ON execution_runs FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = execution_runs.organization_id
      AND memberships.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "insert_own_runs" ON execution_runs;
CREATE POLICY "insert_own_runs" ON execution_runs FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = execution_runs.organization_id
      AND memberships.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "update_own_runs" ON execution_runs;
CREATE POLICY "update_own_runs" ON execution_runs FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_runs" ON execution_runs;
CREATE POLICY "delete_own_runs" ON execution_runs FOR DELETE
TO authenticated USING (auth.uid() = user_id);
