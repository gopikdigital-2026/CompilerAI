/*
# Opportunity Intelligence Engine — Enriched Opportunity Fields

1. Purpose
   Enriches the `business_opportunities` table with new fields required by the
   Opportunity Intelligence Engine: economic impact, operational impact, risk,
   implementation time, dependencies, priority explanation, and assignment.
   Also adds new lifecycle states and a new `seo` business area.

2. New Columns on `business_opportunities`
   - `priority_explanation` (text) — Why this priority was assigned
   - `economic_impact` (text) — Estimated economic impact (e.g. "10-20h/semana")
   - `operational_impact` (text) — Operational impact description
   - `risk` (text, default 'low') — Risk level: high, medium, low
   - `implementation_time` (text) — Estimated time to implement
   - `dependencies` (jsonb, default '[]') — List of dependencies
   - `assigned_to` (uuid, nullable) — User assigned to this opportunity

3. Constraint Changes
   - Drops the old `business_opportunities_status_check` constraint and recreates
     it with new states: new, reviewed, approved, in_progress, completed, discarded,
     sent_to_copilot, automated
   - Drops the old `business_opportunities_category_check` constraint and recreates
     it with the new `seo` area added

4. Security
   - No RLS policy changes — existing policies already cover the new columns.
   - No new tables created.

5. Idempotency
   - All column additions use `IF NOT EXISTS` via DO block.
   - Constraint drops use `IF EXISTS`.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_opportunities' AND column_name = 'priority_explanation') THEN
    ALTER TABLE business_opportunities ADD COLUMN priority_explanation text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_opportunities' AND column_name = 'economic_impact') THEN
    ALTER TABLE business_opportunities ADD COLUMN economic_impact text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_opportunities' AND column_name = 'operational_impact') THEN
    ALTER TABLE business_opportunities ADD COLUMN operational_impact text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_opportunities' AND column_name = 'risk') THEN
    ALTER TABLE business_opportunities ADD COLUMN risk text DEFAULT 'low';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_opportunities' AND column_name = 'implementation_time') THEN
    ALTER TABLE business_opportunities ADD COLUMN implementation_time text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_opportunities' AND column_name = 'dependencies') THEN
    ALTER TABLE business_opportunities ADD COLUMN dependencies jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_opportunities' AND column_name = 'assigned_to') THEN
    ALTER TABLE business_opportunities ADD COLUMN assigned_to uuid;
  END IF;
END $$;

-- Update status constraint to include new lifecycle states
ALTER TABLE business_opportunities DROP CONSTRAINT IF EXISTS business_opportunities_status_check;
ALTER TABLE business_opportunities ADD CONSTRAINT business_opportunities_status_check
  CHECK (status IN ('new', 'reviewed', 'approved', 'in_progress', 'completed', 'discarded', 'sent_to_copilot', 'automated'));

-- Update category constraint to include 'seo' area
ALTER TABLE business_opportunities DROP CONSTRAINT IF EXISTS business_opportunities_category_check;
ALTER TABLE business_opportunities ADD CONSTRAINT business_opportunities_category_check
  CHECK (category IN ('marketing', 'sales', 'operations', 'finance', 'customer_service', 'automation', 'technology', 'seo'));
