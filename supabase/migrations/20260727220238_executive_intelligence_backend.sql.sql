/*
# Executive Intelligence Backend Entities

## Purpose
Creates backend entities for the Executive Report system:
ExecutiveReport, HealthScore, Evidence, Recommendation, Risk, ActionPlan,
ActionHistory, Insight, Roadmap, RoadmapPhase, ReportShare.
All organization-scoped with RLS.

## New Tables (11)
1. executive_reports — generated executive reports per analysis
2. health_scores — health score snapshots per analysis
3. evidences — standalone evidence records
4. recommendations — AI recommendations
5. risk_assessments — risk records
6. action_plans — action plans per opportunity
7. action_history — audit log of actions on opportunities
8. insights — AI insights per analysis
9. roadmaps — auto-generated roadmaps per analysis
10. roadmap_phases — phases within a roadmap (7/30/90 days)
11. report_shares — sharing audit log

## Security
- RLS on ALL tables, scoped by org membership via memberships table.
- 4 policies per table (SELECT/INSERT/UPDATE/DELETE).
- No cross-org data access.
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. executive_reports
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS executive_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES business_analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  what_answer text,
  why_answer text,
  impact_answer text,
  what_to_do_answer text,
  what_happens_answer text,
  next_best_action text,
  economic_impact text,
  readability_time text DEFAULT '~2 min',
  data_quality_level text DEFAULT 'insufficient',
  data_quality_description text,
  weaknesses jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE executive_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_exec_reports" ON executive_reports;
CREATE POLICY "select_own_exec_reports" ON executive_reports FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = executive_reports.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_exec_reports" ON executive_reports;
CREATE POLICY "insert_own_exec_reports" ON executive_reports FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = executive_reports.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_exec_reports" ON executive_reports;
CREATE POLICY "update_own_exec_reports" ON executive_reports FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = executive_reports.organization_id AND m.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = executive_reports.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_exec_reports" ON executive_reports;
CREATE POLICY "delete_own_exec_reports" ON executive_reports FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = executive_reports.organization_id AND m.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. health_scores
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES business_analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  score integer NOT NULL DEFAULT 0,
  label text,
  trend text DEFAULT 'unknown',
  confidence integer DEFAULT 0,
  dimensions jsonb DEFAULT '[]'::jsonb,
  calculation_method text,
  sources_used jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_health_scores" ON health_scores;
CREATE POLICY "select_own_health_scores" ON health_scores FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = health_scores.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_health_scores" ON health_scores;
CREATE POLICY "insert_own_health_scores" ON health_scores FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = health_scores.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_health_scores" ON health_scores;
CREATE POLICY "update_own_health_scores" ON health_scores FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = health_scores.organization_id AND m.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = health_scores.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_health_scores" ON health_scores;
CREATE POLICY "delete_own_health_scores" ON health_scores FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = health_scores.organization_id AND m.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. evidences
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES business_opportunities(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES business_analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  data_source text NOT NULL,
  capture_date timestamptz DEFAULT now(),
  metric_used text,
  observed_value text,
  expected_value text,
  quality text DEFAULT 'medium',
  confidence integer DEFAULT 0,
  limitations text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE evidences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_evidences" ON evidences;
CREATE POLICY "select_own_evidences" ON evidences FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = evidences.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_evidences" ON evidences;
CREATE POLICY "insert_own_evidences" ON evidences FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = evidences.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_evidences" ON evidences;
CREATE POLICY "update_own_evidences" ON evidences FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = evidences.organization_id AND m.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = evidences.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_evidences" ON evidences;
CREATE POLICY "delete_own_evidences" ON evidences FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = evidences.organization_id AND m.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. recommendations
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES business_analyses(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES business_opportunities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium',
  confidence integer DEFAULT 0,
  reasoning text,
  evidence_refs jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_recommendations" ON recommendations;
CREATE POLICY "select_own_recommendations" ON recommendations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = recommendations.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_recommendations" ON recommendations;
CREATE POLICY "insert_own_recommendations" ON recommendations FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = recommendations.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_recommendations" ON recommendations;
CREATE POLICY "update_own_recommendations" ON recommendations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = recommendations.organization_id AND m.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = recommendations.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_recommendations" ON recommendations;
CREATE POLICY "delete_own_recommendations" ON recommendations FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = recommendations.organization_id AND m.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. risk_assessments
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES business_analyses(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES business_opportunities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  description text,
  severity text DEFAULT 'medium',
  likelihood text DEFAULT 'medium',
  mitigation text,
  status text DEFAULT 'open',
  evidence_refs jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_risks" ON risk_assessments;
CREATE POLICY "select_own_risks" ON risk_assessments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = risk_assessments.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_risks" ON risk_assessments;
CREATE POLICY "insert_own_risks" ON risk_assessments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = risk_assessments.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_risks" ON risk_assessments;
CREATE POLICY "update_own_risks" ON risk_assessments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = risk_assessments.organization_id AND m.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = risk_assessments.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_risks" ON risk_assessments;
CREATE POLICY "delete_own_risks" ON risk_assessments FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = risk_assessments.organization_id AND m.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. action_plans
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES business_opportunities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  action_type text NOT NULL,
  description text,
  assigned_to uuid,
  scheduled_for timestamptz,
  status text DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_action_plans" ON action_plans;
CREATE POLICY "select_own_action_plans" ON action_plans FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = action_plans.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_action_plans" ON action_plans;
CREATE POLICY "insert_own_action_plans" ON action_plans FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = action_plans.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_action_plans" ON action_plans;
CREATE POLICY "update_own_action_plans" ON action_plans FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = action_plans.organization_id AND m.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = action_plans.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_action_plans" ON action_plans;
CREATE POLICY "delete_own_action_plans" ON action_plans FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = action_plans.organization_id AND m.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. action_history
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS action_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES business_opportunities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  user_email text,
  action text NOT NULL,
  action_label text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE action_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_action_history" ON action_history;
CREATE POLICY "select_own_action_history" ON action_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = action_history.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_action_history" ON action_history;
CREATE POLICY "insert_own_action_history" ON action_history FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = action_history.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_action_history" ON action_history;
CREATE POLICY "update_own_action_history" ON action_history FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = action_history.organization_id AND m.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = action_history.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_action_history" ON action_history;
CREATE POLICY "delete_own_action_history" ON action_history FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = action_history.organization_id AND m.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. insights
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES business_analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  description text,
  confidence integer DEFAULT 0,
  evidence_refs jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_insights" ON insights;
CREATE POLICY "select_own_insights" ON insights FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = insights.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_insights" ON insights;
CREATE POLICY "insert_own_insights" ON insights FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = insights.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_insights" ON insights;
CREATE POLICY "update_own_insights" ON insights FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = insights.organization_id AND m.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = insights.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_insights" ON insights;
CREATE POLICY "delete_own_insights" ON insights FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = insights.organization_id AND m.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. roadmaps
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES business_analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'Roadmap Automático',
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_roadmaps" ON roadmaps;
CREATE POLICY "select_own_roadmaps" ON roadmaps FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = roadmaps.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_roadmaps" ON roadmaps;
CREATE POLICY "insert_own_roadmaps" ON roadmaps FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = roadmaps.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_roadmaps" ON roadmaps;
CREATE POLICY "update_own_roadmaps" ON roadmaps FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = roadmaps.organization_id AND m.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = roadmaps.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_roadmaps" ON roadmaps;
CREATE POLICY "delete_own_roadmaps" ON roadmaps FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = roadmaps.organization_id AND m.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. roadmap_phases
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS roadmap_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  roadmap_id uuid NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  phase text NOT NULL,
  objective text NOT NULL,
  actions jsonb DEFAULT '[]'::jsonb,
  expected_impact text,
  risks jsonb DEFAULT '[]'::jsonb,
  dependencies jsonb DEFAULT '[]'::jsonb,
  suggested_owner text,
  opportunity_ids jsonb DEFAULT '[]'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE roadmap_phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_roadmap_phases" ON roadmap_phases;
CREATE POLICY "select_own_roadmap_phases" ON roadmap_phases FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = roadmap_phases.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_roadmap_phases" ON roadmap_phases;
CREATE POLICY "insert_own_roadmap_phases" ON roadmap_phases FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = roadmap_phases.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_roadmap_phases" ON roadmap_phases;
CREATE POLICY "update_own_roadmap_phases" ON roadmap_phases FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = roadmap_phases.organization_id AND m.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = roadmap_phases.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_roadmap_phases" ON roadmap_phases;
CREATE POLICY "delete_own_roadmap_phases" ON roadmap_phases FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = roadmap_phases.organization_id AND m.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. report_shares
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS report_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  executive_report_id uuid REFERENCES executive_reports(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES business_analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  user_email text,
  method text NOT NULL,
  recipient text,
  share_token text UNIQUE,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_report_shares" ON report_shares;
CREATE POLICY "select_own_report_shares" ON report_shares FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = report_shares.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_report_shares" ON report_shares;
CREATE POLICY "insert_own_report_shares" ON report_shares FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = report_shares.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_report_shares" ON report_shares;
CREATE POLICY "update_own_report_shares" ON report_shares FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = report_shares.organization_id AND m.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = report_shares.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_report_shares" ON report_shares;
CREATE POLICY "delete_own_report_shares" ON report_shares FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = report_shares.organization_id AND m.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_exec_reports_org ON executive_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_exec_reports_analysis ON executive_reports(analysis_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_org ON health_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_analysis ON health_scores(analysis_id);
CREATE INDEX IF NOT EXISTS idx_evidences_org ON evidences(organization_id);
CREATE INDEX IF NOT EXISTS idx_evidences_opp ON evidences(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_org ON recommendations(organization_id);
CREATE INDEX IF NOT EXISTS idx_risks_org ON risk_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_org ON action_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_opp ON action_plans(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_action_history_org ON action_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_action_history_opp ON action_history(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_insights_org ON insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_org ON roadmaps(organization_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_phases_roadmap ON roadmap_phases(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_org ON report_shares(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_token ON report_shares(share_token);
