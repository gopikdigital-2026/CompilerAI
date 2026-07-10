/*
# SaaS Core Schema (Part 2) — Cross-Reference Policies and RPC

Adds policies that join across tables (now that all tables exist)
and creates the create_organization_with_owner RPC function.
*/

-- ORGANIZATIONS cross-ref policies (memberships now exists)
DROP POLICY IF EXISTS "members_select_org"       ON organizations;
DROP POLICY IF EXISTS "authenticated_insert_org" ON organizations;
DROP POLICY IF EXISTS "admins_update_org"        ON organizations;
DROP POLICY IF EXISTS "owner_delete_org"         ON organizations;

CREATE POLICY "members_select_org" ON organizations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = organizations.id
      AND memberships.user_id = auth.uid()
  )
);

CREATE POLICY "authenticated_insert_org" ON organizations FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "admins_update_org" ON organizations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = organizations.id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = organizations.id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
);

CREATE POLICY "owner_delete_org" ON organizations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = organizations.id
      AND memberships.user_id = auth.uid()
      AND memberships.role = 'owner'
  )
);

-- PROFILES: select policy (own + org members)
DROP POLICY IF EXISTS "users_select_own_profile"    ON profiles;
DROP POLICY IF EXISTS "org_members_select_profiles" ON profiles;

CREATE POLICY "users_select_own_profile" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

CREATE POLICY "org_members_select_profiles" ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM memberships m1
    JOIN memberships m2 ON m1.organization_id = m2.organization_id
    WHERE m1.user_id = auth.uid()
      AND m2.user_id = profiles.id
  )
);

-- MEMBERSHIPS: remaining policies
DROP POLICY IF EXISTS "admins_select_org_memberships" ON memberships;
DROP POLICY IF EXISTS "admins_insert_memberships"     ON memberships;
DROP POLICY IF EXISTS "owners_update_memberships"     ON memberships;
DROP POLICY IF EXISTS "admins_delete_memberships"     ON memberships;

CREATE POLICY "admins_select_org_memberships" ON memberships FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = memberships.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  )
);

CREATE POLICY "admins_insert_memberships" ON memberships FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = memberships.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  )
);

CREATE POLICY "owners_update_memberships" ON memberships FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = memberships.organization_id
      AND m.user_id = auth.uid()
      AND m.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = memberships.organization_id
      AND m.user_id = auth.uid()
      AND m.role = 'owner'
  )
);

CREATE POLICY "admins_delete_memberships" ON memberships FOR DELETE
TO authenticated
USING (
  memberships.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = memberships.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  )
);

-- API KEYS policies
DROP POLICY IF EXISTS "members_select_api_keys" ON api_keys;
DROP POLICY IF EXISTS "admins_insert_api_keys"  ON api_keys;
DROP POLICY IF EXISTS "admins_delete_api_keys"  ON api_keys;

CREATE POLICY "members_select_api_keys" ON api_keys FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = api_keys.organization_id
      AND memberships.user_id = auth.uid()
  )
);

CREATE POLICY "admins_insert_api_keys" ON api_keys FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = api_keys.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
);

CREATE POLICY "admins_delete_api_keys" ON api_keys FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = api_keys.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
);

-- RPC: create org + owner membership atomically (bypasses bootstrap issue)
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(org_name text)
RETURNS organizations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_org organizations;
BEGIN
  INSERT INTO organizations (name) VALUES (org_name) RETURNING * INTO new_org;
  INSERT INTO memberships (user_id, organization_id, role)
  VALUES (auth.uid(), new_org.id, 'owner');
  RETURN new_org;
END;
$$;
