/*
# Create brain_decisions table

## Purpose
Persists every decision the AI Brain makes across its 6 modules:
Decision Center, Planning Engine, Reasoning Engine, Strategy Engine,
Risk Analyzer, and Optimization Center.

The schema is intentionally forward-looking:
  - `provider` / `model` → pluggable AI provider (OpenAI, Anthropic, etc.)
  - `chain_of_thought` → stores the full reasoning trace for interpretability
  - `embeddings_ref` → links to vector store for semantic retrieval
  - `parent_decision_id` → supports hierarchical decision trees

## Security
RLS enabled with 4 separate policies (SELECT/INSERT/UPDATE/DELETE).
Org members can read all decisions; only the owner can write.
*/

CREATE TABLE IF NOT EXISTS brain_decisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL DEFAULT auth.uid(),

  -- Module classification
  module          text NOT NULL
    CHECK (module IN ('decision', 'planning', 'reasoning', 'strategy', 'risk', 'optimization')),

  -- Core fields
  title           text NOT NULL,
  reason          text NOT NULL DEFAULT '',
  explanation     text NOT NULL DEFAULT '',
  confidence      int  NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  risk_level      text NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status          text NOT NULL DEFAULT 'executed'
    CHECK (status IN ('pending', 'executed', 'rejected')),

  -- Related entities
  agents          text[]   NOT NULL DEFAULT '{}',
  tools           text[]   NOT NULL DEFAULT '{}',
  tags            text[]   NOT NULL DEFAULT '{}',

  -- Structured payload (alternatives, risks avoided, what-if analysis, etc.)
  metadata        jsonb    NOT NULL DEFAULT '{}',
  alternatives    jsonb    NOT NULL DEFAULT '[]',
  risks_avoided   jsonb    NOT NULL DEFAULT '[]',

  -- AI provider tracing (future integration)
  provider        text,      -- 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'mistral' | 'local'
  model           text,
  prompt_tokens   int,
  completion_tokens int,
  chain_of_thought  jsonb,   -- array of reasoning steps for interpretability

  -- Graph / hierarchy
  parent_decision_id  uuid REFERENCES brain_decisions(id) ON DELETE SET NULL,
  embeddings_ref      text,  -- future: vector store reference

  -- Timing
  created_at          timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz
);

CREATE INDEX IF NOT EXISTS brain_decisions_org_module_idx
  ON brain_decisions (organization_id, module, created_at DESC);

CREATE INDEX IF NOT EXISTS brain_decisions_user_idx
  ON brain_decisions (user_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE brain_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_brain_decisions" ON brain_decisions;
CREATE POLICY "select_brain_decisions" ON brain_decisions FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = brain_decisions.organization_id
      AND memberships.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "insert_brain_decisions" ON brain_decisions;
CREATE POLICY "insert_brain_decisions" ON brain_decisions FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = brain_decisions.organization_id
      AND memberships.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "update_brain_decisions" ON brain_decisions;
CREATE POLICY "update_brain_decisions" ON brain_decisions FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_brain_decisions" ON brain_decisions;
CREATE POLICY "delete_brain_decisions" ON brain_decisions FOR DELETE
TO authenticated USING (auth.uid() = user_id);
