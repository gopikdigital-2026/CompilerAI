/*
# Create memory_entries table

## Purpose
The Cognitive Memory Engine requires a persistent store for all four memory
types: short_term (session-scoped), long_term (user-scoped), organizational
(org-wide shared), and semantic (knowledge graph nodes).

The schema is intentionally forward-looking:
  - `embedding_model` / `chunk_index` / `source_ref` → RAG pipeline integration
  - `entity_type` / `entity_id` / `relations` (jsonb) → Knowledge graph edges
  - `confidence` / `relevance_score` → future vector similarity scoring

No actual vector column is added yet; pgvector can be layered on top
once the extension is enabled and embeddings are generated.

## New Tables
- `memory_entries` — master table for all memory types
  - All non-confidential entries in 'organizational' type are readable by all
    org members. Personal entries (short_term / long_term) are owner-only.

## Security
- RLS enabled. Separate SELECT/INSERT/UPDATE/DELETE policies.
- Org-wide read for organizational & semantic memory.
- Owner-only read/write for short_term & long_term.
*/

CREATE TABLE IF NOT EXISTS memory_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL DEFAULT auth.uid(),

  -- Core classification
  memory_type   text NOT NULL
    CHECK (memory_type IN ('short_term', 'long_term', 'organizational', 'semantic')),
  category      text NOT NULL DEFAULT 'general',

  -- Content
  title         text NOT NULL,
  content       text NOT NULL DEFAULT '',
  metadata      jsonb NOT NULL DEFAULT '{}',
  tags          text[] NOT NULL DEFAULT '{}',

  -- RAG / Vector DB preparation (future: store chunk text + embedding model)
  embedding_model  text,
  chunk_index      int  NOT NULL DEFAULT 0,
  source_ref       text,

  -- Knowledge graph preparation
  entity_type   text,
  entity_id     text,
  relations     jsonb NOT NULL DEFAULT '[]',  -- [{ targetId, relType, weight }]

  -- Scoring / quality
  confidence      float NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  relevance_score float,
  used_count      int   NOT NULL DEFAULT 0,

  -- Timing
  learned_at       timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz,  -- NULL = permanent; set for short_term entries

  -- Soft-delete
  archived_at  timestamptz
);

-- Optimised lookup indexes
CREATE INDEX IF NOT EXISTS memory_entries_org_type_idx
  ON memory_entries (organization_id, memory_type, learned_at DESC);

CREATE INDEX IF NOT EXISTS memory_entries_user_type_idx
  ON memory_entries (user_id, memory_type, learned_at DESC);

CREATE INDEX IF NOT EXISTS memory_entries_entity_idx
  ON memory_entries (entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE memory_entries ENABLE ROW LEVEL SECURITY;

-- SELECT: owner can always read their entries;
--         org members can read organizational + semantic entries.
DROP POLICY IF EXISTS "select_memory_entries" ON memory_entries;
CREATE POLICY "select_memory_entries" ON memory_entries FOR SELECT
TO authenticated USING (
  auth.uid() = user_id
  OR (
    memory_type IN ('organizational', 'semantic')
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.organization_id = memory_entries.organization_id
        AND memberships.user_id = auth.uid()
    )
  )
);

-- INSERT: owner writes to their own org
DROP POLICY IF EXISTS "insert_memory_entries" ON memory_entries;
CREATE POLICY "insert_memory_entries" ON memory_entries FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = memory_entries.organization_id
      AND memberships.user_id = auth.uid()
  )
);

-- UPDATE: owner only
DROP POLICY IF EXISTS "update_memory_entries" ON memory_entries;
CREATE POLICY "update_memory_entries" ON memory_entries FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DELETE: owner only
DROP POLICY IF EXISTS "delete_memory_entries" ON memory_entries;
CREATE POLICY "delete_memory_entries" ON memory_entries FOR DELETE
TO authenticated USING (auth.uid() = user_id);
