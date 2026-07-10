/*
# Workflow Designer — workflow_designs table

## Summary
Creates the `workflow_designs` table that persists visual workflow graphs built
in the Workflow Designer. Each design contains a serialized node graph (positions,
types, states, configs) and edge set (connections between nodes).

## New Tables

### workflow_designs
One row per saved workflow design.

| Column          | Type        | Description                                               |
|-----------------|-------------|-----------------------------------------------------------|
| id              | uuid        | Primary key                                               |
| organization_id | uuid        | FK → organizations(id)                                    |
| user_id         | uuid        | FK → auth.users(id), defaults to authenticated user      |
| name            | text        | Human-readable workflow name                              |
| description     | text        | Optional description                                      |
| nodes           | jsonb       | Array of WorkflowNode objects with positions and config   |
| edges           | jsonb       | Array of WorkflowEdge objects (connections between nodes) |
| metadata        | jsonb       | Version history, validation results, comments             |
| thumbnail       | text        | Optional thumbnail/preview URL                            |
| is_published    | boolean     | Whether this design is published/live                     |
| created_at      | timestamptz | Creation timestamp                                        |
| updated_at      | timestamptz | Last update timestamp                                     |

## Security
- RLS enabled with 4 separate owner-scoped policies.
- `user_id` defaults to `auth.uid()` so inserts can omit the column.
- `updated_at` auto-maintained by trigger.

## Notes
1. `nodes` and `edges` store the full serialized graph as JSONB — avoids complex
   normalized schema for a graph data structure that changes shape over time.
2. `metadata` stores version history snapshots, validation results, and node comments.
*/

CREATE TABLE IF NOT EXISTS workflow_designs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text        NOT NULL DEFAULT 'Sin título',
  description      text,
  nodes            jsonb       NOT NULL DEFAULT '[]',
  edges            jsonb       NOT NULL DEFAULT '[]',
  metadata         jsonb       NOT NULL DEFAULT '{}',
  thumbnail        text,
  is_published     boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_designs_user_id ON workflow_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_designs_org_id  ON workflow_designs(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_designs_created ON workflow_designs(created_at DESC);

CREATE OR REPLACE FUNCTION update_workflow_designs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_workflow_designs_updated_at ON workflow_designs;
CREATE TRIGGER set_workflow_designs_updated_at
  BEFORE UPDATE ON workflow_designs
  FOR EACH ROW EXECUTE FUNCTION update_workflow_designs_updated_at();

ALTER TABLE workflow_designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workflow_designs" ON workflow_designs;
CREATE POLICY "select_own_workflow_designs" ON workflow_designs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_workflow_designs" ON workflow_designs;
CREATE POLICY "insert_own_workflow_designs" ON workflow_designs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_workflow_designs" ON workflow_designs;
CREATE POLICY "update_own_workflow_designs" ON workflow_designs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_workflow_designs" ON workflow_designs;
CREATE POLICY "delete_own_workflow_designs" ON workflow_designs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
