/*
# Prompt Intelligence Engine — prompt_sessions table

## Summary
Creates the `prompt_sessions` table to persist the history of prompts analyzed and
optimized by the Prompt Intelligence Engine. Each session captures the user's original
prompt, the AI-generated quality score, the detected primary intent, and the optimized
version produced by the engine.

## New Tables

### prompt_sessions
Stores one row per prompt optimization session initiated by a user.

| Column             | Type        | Description                                               |
|--------------------|-------------|-----------------------------------------------------------|
| id                 | uuid        | Primary key, auto-generated                               |
| organization_id    | uuid        | FK → organizations(id), required                         |
| user_id            | uuid        | FK → auth.users(id), defaults to the authenticated user  |
| title              | text        | Session label (auto-generated or user-set)               |
| content            | text        | Original prompt text                                      |
| quality_score      | integer     | Overall quality 0–100 (null until analyzed)              |
| primary_intent     | text        | Top detected intent (automation/analysis/creation/…)     |
| optimized_content  | text        | AI-improved version of the prompt (null until optimized) |
| metadata           | jsonb       | Full analysis payload (scores, intents, suggestions)     |
| created_at         | timestamptz | Row creation time                                         |
| updated_at         | timestamptz | Last update time                                          |

## Security
- RLS enabled; 4 separate policies (SELECT / INSERT / UPDATE / DELETE).
- All policies scoped to `authenticated`, using `auth.uid() = user_id`.
- `user_id` defaults to `auth.uid()` so the client can omit it on insert.

## Notes
1. `metadata` stores the full structured analysis (analyzer scores, intents, suggestions,
   score metrics) as JSONB to avoid over-normalizing a heavily nested payload.
2. The trigger `set_updated_at` keeps `updated_at` in sync on every update.
*/

-- ── Table ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prompt_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text        NOT NULL DEFAULT 'Sin título',
  content          text        NOT NULL DEFAULT '',
  quality_score    integer     CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
  primary_intent   text,
  optimized_content text,
  metadata         jsonb       NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Index ──────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_prompt_sessions_user_id ON prompt_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_sessions_org_id  ON prompt_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_prompt_sessions_created ON prompt_sessions(created_at DESC);

-- ── updated_at trigger ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_prompt_sessions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_prompt_sessions_updated_at ON prompt_sessions;
CREATE TRIGGER set_prompt_sessions_updated_at
  BEFORE UPDATE ON prompt_sessions
  FOR EACH ROW EXECUTE FUNCTION update_prompt_sessions_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE prompt_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_prompt_sessions" ON prompt_sessions;
CREATE POLICY "select_own_prompt_sessions" ON prompt_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_prompt_sessions" ON prompt_sessions;
CREATE POLICY "insert_own_prompt_sessions" ON prompt_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_prompt_sessions" ON prompt_sessions;
CREATE POLICY "update_own_prompt_sessions" ON prompt_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_prompt_sessions" ON prompt_sessions;
CREATE POLICY "delete_own_prompt_sessions" ON prompt_sessions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
