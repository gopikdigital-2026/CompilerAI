/*
# Action Engine — Extend existing tables + add comments, assignments, notifications

## Purpose
Complete the Action Engine backend. The `action_plans` and `action_history`
tables already exist from a prior migration. This migration:
1. Adds missing columns to `action_plans` (title, priority, expected_impact,
   expected_roi, progress, due_date, impact, urgency, effort, risk,
   dependencies, origin, updated_at).
2. Adds missing columns to `action_history` (action_id, from_status,
   to_status, comment) to support the full audit trail.
3. Creates 3 new tables: action_comments, action_assignments,
   action_notifications.
4. Adds RLS policies to the new tables.
5. Adds indexes for performant queries.

## Modified Tables

### action_plans (extended)
New columns:
- title (text) — action title
- priority (text: critical/high/medium/low, default 'medium')
- expected_impact (text) — expected business impact
- expected_roi (text) — expected ROI
- progress (int 0-100, default 0)
- due_date (date, nullable)
- impact (text: high/medium/low, default 'medium')
- urgency (text: high/medium/low, default 'medium')
- effort (text: high/medium/low, default 'medium')
- risk (text: high/medium/low, default 'low')
- dependencies (jsonb array, default '[]')
- origin (text: 'opportunity' | 'manual', default 'manual')
- updated_at (timestamptz, default now())

### action_history (extended)
New columns:
- action_id (uuid, nullable — links to action_plans.id)
- from_status (text, nullable)
- to_status (text, nullable)
- comment (text, nullable)

## New Tables

### action_comments
Collaborative comments on an action.

### action_assignments
Tracks assignment history (an action can be reassigned).

### action_notifications
In-app notification events for actions — scoped to the notified user.

## Security
- RLS enabled on all 3 new tables.
- Org members can SELECT (via memberships check).
- Authenticated members can INSERT.
- owner + admin can DELETE.
- action_notifications: user can only see/update their own notifications.
*/

-- ── Extend action_plans ─────────────────────────────────────────────────────

ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS expected_impact text;
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS expected_roi text;
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS impact text DEFAULT 'medium';
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'medium';
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS effort text DEFAULT 'medium';
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS risk text DEFAULT 'low';
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS dependencies jsonb DEFAULT '[]'::jsonb;
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS origin text DEFAULT 'manual';
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill title from description for existing rows
UPDATE action_plans SET title = COALESCE(title, description, action_type) WHERE title IS NULL;
ALTER TABLE action_plans ALTER COLUMN title SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_action_plans_org_status_created
  ON action_plans (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_plans_assigned_to
  ON action_plans (assigned_to);
CREATE INDEX IF NOT EXISTS idx_action_plans_opportunity
  ON action_plans (opportunity_id);

-- ── Extend action_history ───────────────────────────────────────────────────

ALTER TABLE action_history ADD COLUMN IF NOT EXISTS action_id uuid REFERENCES action_plans(id) ON DELETE CASCADE;
ALTER TABLE action_history ADD COLUMN IF NOT EXISTS from_status text;
ALTER TABLE action_history ADD COLUMN IF NOT EXISTS to_status text;
ALTER TABLE action_history ADD COLUMN IF NOT EXISTS comment text;

CREATE INDEX IF NOT EXISTS idx_action_history_action_created
  ON action_history (action_id, created_at DESC);

-- ── action_comments ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS action_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE action_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_action_comments" ON action_comments;
CREATE POLICY "select_org_action_comments" ON action_comments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = action_comments.organization_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_org_action_comments" ON action_comments;
CREATE POLICY "insert_org_action_comments" ON action_comments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = action_comments.organization_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_org_action_comments" ON action_comments;
CREATE POLICY "delete_org_action_comments" ON action_comments FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = action_comments.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_action_comments_action_created
  ON action_comments (action_id, created_at);

-- ── action_assignments ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS action_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL,
  assigned_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE action_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_action_assignments" ON action_assignments;
CREATE POLICY "select_org_action_assignments" ON action_assignments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = action_assignments.organization_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_org_action_assignments" ON action_assignments;
CREATE POLICY "insert_org_action_assignments" ON action_assignments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = action_assignments.organization_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_org_action_assignments" ON action_assignments;
CREATE POLICY "delete_org_action_assignments" ON action_assignments FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = action_assignments.organization_id
      AND m.user_id = auth.uid()
      AND m.role = 'owner'
    )
  );

CREATE INDEX IF NOT EXISTS idx_action_assignments_action
  ON action_assignments (action_id);

-- ── action_notifications ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS action_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action_id uuid NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL,
  message text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE action_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_action_notifications" ON action_notifications;
CREATE POLICY "select_own_action_notifications" ON action_notifications FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = action_notifications.organization_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_org_action_notifications" ON action_notifications;
CREATE POLICY "insert_org_action_notifications" ON action_notifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = action_notifications.organization_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_action_notifications" ON action_notifications;
CREATE POLICY "update_own_action_notifications" ON action_notifications FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = action_notifications.organization_id
      AND m.user_id = auth.uid()
    )
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = action_notifications.organization_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_org_action_notifications" ON action_notifications;
CREATE POLICY "delete_org_action_notifications" ON action_notifications FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = action_notifications.organization_id
      AND m.user_id = auth.uid()
      AND m.role = 'owner'
    )
  );

CREATE INDEX IF NOT EXISTS idx_action_notifications_user_read
  ON action_notifications (user_id, read, created_at DESC);