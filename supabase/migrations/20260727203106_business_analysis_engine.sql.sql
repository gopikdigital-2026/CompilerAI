/*
# Business Analysis Engine Tables

## Purpose
Persist full business analysis results and detected opportunities from the
Compiler Intelligence Engine. Each analysis runs through multiple stages
(preparing, validating, collecting, analyzing, generating, finalizing) and
produces a structured report with scored business areas and prioritized
opportunities.

## New Tables

### 1. business_analyses
Stores each analysis run with its full result payload.
- id (uuid PK)
- organization_id (uuid FK -> organizations, CASCADE)
- user_id (uuid, defaults to auth.uid())
- status (text: preparing/validating/collecting/analyzing/generating/finalizing/completed/error/cancelled)
- scope (text: what was analyzed)
- result (jsonb: full structured analysis — summary, areas, scores, confidence)
- error (text: error message if failed)
- engine_version (text: intelligence engine version that produced the result)
- duration_ms (int: total analysis duration)
- opportunities_count (int: number of opportunities detected)
- confidence (int 0-100: overall confidence of the analysis)
- created_at, completed_at (timestamptz)

### 2. business_opportunities
Stores individual opportunities detected during analyses.
- id (uuid PK)
- analysis_id (uuid FK -> business_analyses, CASCADE)
- organization_id (uuid FK -> organizations, CASCADE)
- user_id (uuid, defaults to auth.uid())
- title (text)
- description (text)
- category (text: marketing/sales/operations/finance/customer_service/automation/technology)
- priority (text: critical/high/medium/low)
- confidence (int 0-100)
- impact (text: high/medium/low)
- effort (text: high/medium/low)
- estimated_roi (text: e.g. "15-25% cost reduction")
- source (text: data source that informed this opportunity)
- evidence (jsonb: array of evidence items — data used, connectors, limitations)
- status (text: new/approved/discarded/sent_to_copilot/automated)
- created_at, resolved_at (timestamptz)

## Security
- RLS enabled on both tables.
- Org members can SELECT (via memberships check).
- Only owner can INSERT/UPDATE/DELETE.
- user_id defaults to auth.uid() so inserts from the client succeed.

## Indexes
- business_analyses(organization_id, created_at DESC) — recent analyses per org
- business_opportunities(organization_id, status, created_at DESC) — opportunities by status
- business_opportunities(analysis_id) — opportunities per analysis
*/

CREATE TABLE IF NOT EXISTS business_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  status text NOT NULL DEFAULT 'preparing',
  scope text,
  result jsonb,
  error text,
  engine_version text DEFAULT '1.0.0',
  duration_ms integer,
  opportunities_count integer DEFAULT 0,
  confidence integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE business_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_analyses" ON business_analyses;
CREATE POLICY "select_org_analyses" ON business_analyses FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = business_analyses.organization_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_org_analyses" ON business_analyses;
CREATE POLICY "insert_org_analyses" ON business_analyses FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = business_analyses.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "update_org_analyses" ON business_analyses;
CREATE POLICY "update_org_analyses" ON business_analyses FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = business_analyses.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = business_analyses.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "delete_org_analyses" ON business_analyses;
CREATE POLICY "delete_org_analyses" ON business_analyses FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = business_analyses.organization_id
      AND m.user_id = auth.uid()
      AND m.role = 'owner'
    )
  );

CREATE INDEX IF NOT EXISTS idx_business_analyses_org_created
  ON business_analyses (organization_id, created_at DESC);

-- ── business_opportunities ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS business_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES business_analyses(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  description text,
  category text DEFAULT 'automation',
  priority text DEFAULT 'medium',
  confidence integer DEFAULT 0,
  impact text DEFAULT 'medium',
  effort text DEFAULT 'medium',
  estimated_roi text,
  source text,
  evidence jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE business_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_opportunities" ON business_opportunities;
CREATE POLICY "select_org_opportunities" ON business_opportunities FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = business_opportunities.organization_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_org_opportunities" ON business_opportunities;
CREATE POLICY "insert_org_opportunities" ON business_opportunities FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = business_opportunities.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "update_org_opportunities" ON business_opportunities;
CREATE POLICY "update_org_opportunities" ON business_opportunities FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = business_opportunities.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = business_opportunities.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "delete_org_opportunities" ON business_opportunities;
CREATE POLICY "delete_org_opportunities" ON business_opportunities FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = business_opportunities.organization_id
      AND m.user_id = auth.uid()
      AND m.role = 'owner'
    )
  );

CREATE INDEX IF NOT EXISTS idx_business_opportunities_org_status
  ON business_opportunities (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_opportunities_analysis
  ON business_opportunities (analysis_id);
