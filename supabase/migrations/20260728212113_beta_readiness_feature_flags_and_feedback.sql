/*
# Beta Readiness: Feature Flags and Feedback Tables

1. New Tables
- `feature_flags`: Global feature toggle system. Stores flag key, display name, description, enabled state, and timestamps. Admins toggle features without redeploying.
- `feedback`: User-submitted feedback (bugs, ideas, improvements, UX, performance). Captures user, page, browser, version, and optional screenshot URL.

2. Columns
- feature_flags: id (uuid PK), key (text unique, e.g. "executive_report"), name (text), description (text), enabled (bool default true), created_at, updated_at
- feedback: id (uuid PK), user_id (uuid FK auth.users), organization_id (uuid FK organizations), type (text: bug/idea/improvement/ux/performance), message (text), page_url (text), browser (text), app_version (text), screenshot_url (text nullable), status (text default 'open'), created_at

3. Security (RLS)
- feature_flags: SELECT for all authenticated users. INSERT/UPDATE/DELETE restricted to owners/admins via memberships.role check.
- feedback: INSERT for any authenticated user (own user_id only). SELECT for own feedback + owners/admins see all org feedback. UPDATE/DELETE for owners/admins only.

4. Indexes
- feature_flags: unique index on key
- feedback: index on organization_id, user_id, status
*/
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ff_select_authenticated" ON feature_flags;
CREATE POLICY "ff_select_authenticated" ON feature_flags FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "ff_insert_admin" ON feature_flags;
CREATE POLICY "ff_insert_admin" ON feature_flags FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "ff_update_admin" ON feature_flags;
CREATE POLICY "ff_update_admin" ON feature_flags FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "ff_delete_admin" ON feature_flags;
CREATE POLICY "ff_delete_admin" ON feature_flags FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  );

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('bug', 'idea', 'improvement', 'ux', 'performance')),
  message text NOT NULL,
  page_url text,
  browser text,
  app_version text,
  screenshot_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fb_insert_own" ON feedback;
CREATE POLICY "fb_insert_own" ON feedback FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fb_select_own_or_admin" ON feedback;
CREATE POLICY "fb_select_own_or_admin" ON feedback FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "fb_update_admin" ON feedback;
CREATE POLICY "fb_update_admin" ON feedback FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "fb_delete_admin" ON feedback;
CREATE POLICY "fb_delete_admin" ON feedback FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feedback_org_id ON feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
