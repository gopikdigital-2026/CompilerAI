/*
# SaaS Core Schema (Part 1) — Tables and Triggers

Creates the four core tables without cross-referencing policies.
Policies that reference other tables are added in Part 2.
*/

-- ORGANIZATIONS (bare table + non-cross-ref RLS)
CREATE TABLE IF NOT EXISTS organizations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  logo_url    text,
  plan        text        NOT NULL DEFAULT 'free'
              CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text        NOT NULL DEFAULT '',
  avatar_url  text,
  job_title   text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_insert_own_profile"     ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile"     ON profiles;
DROP POLICY IF EXISTS "users_delete_own_profile"     ON profiles;

CREATE POLICY "users_insert_own_profile" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "users_delete_own_profile" ON profiles FOR DELETE
TO authenticated USING (auth.uid() = id);

-- MEMBERSHIPS
CREATE TABLE IF NOT EXISTS memberships (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role             text NOT NULL DEFAULT 'member'
                   CHECK (role IN ('owner', 'admin', 'member')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_memberships" ON memberships;

CREATE POLICY "users_select_own_memberships" ON memberships FOR SELECT
TO authenticated USING (memberships.user_id = auth.uid());

-- API KEYS
CREATE TABLE IF NOT EXISTS api_keys (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  key_preview      text        NOT NULL,
  key_hash         text        NOT NULL DEFAULT '',
  created_by       uuid        NOT NULL REFERENCES auth.users(id),
  last_used_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_id  ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id     ON api_keys(organization_id);

-- TRIGGER: auto-create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
