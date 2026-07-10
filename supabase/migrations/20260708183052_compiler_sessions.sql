/*
# Create compiler_sessions table

## Purpose
Stores all Blueprint compilation requests and their results for the Compiler Studio.

## New Tables
- `compiler_sessions`
  - `id` (uuid, primary key)
  - `organization_id` (uuid, FK → organizations, cascade delete)
  - `user_id` (uuid, defaults to auth.uid())
  - `prompt` (text, the natural language request)
  - `blueprint` (jsonb, the generated Blueprint object)
  - `status` (text, 'compiling' | 'complete' | 'error')
  - `error` (text, optional error message)
  - `created_at` / `updated_at` (timestamps)

## Security
- RLS enabled. Authenticated users can CRUD their own sessions.
- SELECT also allows any org member to read the org's sessions.

## Notes
- blueprint column is jsonb to support evolving Blueprint schema without migrations.
- user_id defaults to auth.uid() so inserts from client don't need to pass it.
*/

CREATE TABLE IF NOT EXISTS compiler_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL DEFAULT auth.uid(),
  prompt         text NOT NULL,
  blueprint      jsonb,
  status         text NOT NULL DEFAULT 'complete'
                   CHECK (status IN ('compiling', 'complete', 'error')),
  error          text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compiler_sessions_org_idx
  ON compiler_sessions (organization_id, created_at DESC);

ALTER TABLE compiler_sessions ENABLE ROW LEVEL SECURITY;

-- Any org member can read sessions
DROP POLICY IF EXISTS "select_org_sessions" ON compiler_sessions;
CREATE POLICY "select_org_sessions" ON compiler_sessions FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = compiler_sessions.organization_id
      AND memberships.user_id = auth.uid()
  )
);

-- Only the owner can insert
DROP POLICY IF EXISTS "insert_own_sessions" ON compiler_sessions;
CREATE POLICY "insert_own_sessions" ON compiler_sessions FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = compiler_sessions.organization_id
      AND memberships.user_id = auth.uid()
  )
);

-- Only the owner can update
DROP POLICY IF EXISTS "update_own_sessions" ON compiler_sessions;
CREATE POLICY "update_own_sessions" ON compiler_sessions FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Only the owner can delete
DROP POLICY IF EXISTS "delete_own_sessions" ON compiler_sessions;
CREATE POLICY "delete_own_sessions" ON compiler_sessions FOR DELETE
TO authenticated USING (auth.uid() = user_id);
