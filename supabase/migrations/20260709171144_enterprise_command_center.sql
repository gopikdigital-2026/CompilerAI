
CREATE TABLE IF NOT EXISTS enterprise_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  captured_at     timestamptz NOT NULL DEFAULT now(),
  kpis            jsonb NOT NULL DEFAULT '{}',
  system_status   jsonb NOT NULL DEFAULT '{}',
  ai_health       jsonb NOT NULL DEFAULT '{}',
  readiness_score integer,
  notes           text
);

ALTER TABLE enterprise_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_enterprise_snapshots" ON enterprise_snapshots
  FOR SELECT TO authenticated USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "insert_own_enterprise_snapshots" ON enterprise_snapshots
  FOR INSERT TO authenticated WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "update_own_enterprise_snapshots" ON enterprise_snapshots
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "delete_own_enterprise_snapshots" ON enterprise_snapshots
  FOR DELETE TO authenticated USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS enterprise_snapshots_org_idx  ON enterprise_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS enterprise_snapshots_time_idx ON enterprise_snapshots(captured_at DESC);
