/*
# Identity, Access & Organization Management — Database Schema

## Summary
Extends the existing SaaS core schema with full identity and access management tables.
Adds: organization settings/limits, user profiles extension, user roles, RBAC roles,
permissions, sessions, invitations, login attempts, and API key enhancements.

## New Tables (9)
1. roles — RBAC role definitions (6 built-in + custom org-scoped roles)
2. permissions — Permission catalog (18 permissions)
3. role_permissions — Many-to-many role↔permission mapping
4. user_roles — User↔organization role assignments
5. sessions — Active session tracking with expiry
6. invitations — User invitations to organizations
7. login_attempts — Login attempt tracking for brute-force protection

## Modified Tables (3)
1. organizations — Adds slug, status, settings JSONB, limits JSONB
2. api_keys — Adds scopes, expires_at, revoked_at, last_used_at
3. profiles — Adds status, preferences, last_login_at, failed_login_count, locked_until

## Security
- RLS enabled on every new table
- All policies scoped by organization membership
- Sessions: only own user can read/modify
- Login attempts: only own user can read
- Permissions: world-readable (static catalog)
- Roles: org members can read, only admins can write
- User roles: org members can read, only admins can write
*/

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. EXTEND ORGANIZATIONS TABLE
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS slug    text UNIQUE,
  ADD COLUMN IF NOT EXISTS status  text NOT NULL DEFAULT 'ACTIVE'
         CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS limits  jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. EXTEND API_KEYS TABLE
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS scopes     text[]   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. EXTEND PROFILES TABLE
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'ACTIVE'
         CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED')),
  ADD COLUMN IF NOT EXISTS preferences  jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_login_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. ROLES TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS roles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  organization_id uuid        REFERENCES organizations(id) ON DELETE CASCADE,
  description     text        NOT NULL DEFAULT '',
  is_system       boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, organization_id)
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_roles" ON roles;
CREATE POLICY "authenticated_select_roles" ON roles FOR SELECT
TO authenticated USING (
  is_system = true
  OR EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = roles.organization_id
      AND memberships.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "admins_insert_roles" ON roles;
CREATE POLICY "admins_insert_roles" ON roles FOR INSERT
TO authenticated WITH CHECK (
  organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = roles.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "admins_update_roles" ON roles;
CREATE POLICY "admins_update_roles" ON roles FOR UPDATE
TO authenticated USING (
  is_system = false
  AND EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = roles.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
) WITH CHECK (
  is_system = false
  AND EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = roles.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. PERMISSIONS TABLE (static catalog)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS permissions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        UNIQUE NOT NULL,
  description  text        NOT NULL DEFAULT '',
  resource     text        NOT NULL,
  action       text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_permissions" ON permissions;
CREATE POLICY "authenticated_select_permissions" ON permissions FOR SELECT
TO authenticated USING (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. ROLE_PERMISSIONS TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       uuid        NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid        NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_role_permissions" ON role_permissions;
CREATE POLICY "authenticated_select_role_permissions" ON role_permissions FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM roles
    WHERE roles.id = role_permissions.role_id
      AND (roles.is_system = true
           OR EXISTS (
             SELECT 1 FROM memberships
             WHERE memberships.organization_id = roles.organization_id
               AND memberships.user_id = auth.uid()
           ))
  )
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. USER_ROLES TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_roles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id         uuid        NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by     uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, role_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_org ON user_roles(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON user_roles(organization_id);

DROP POLICY IF EXISTS "members_select_user_roles" ON user_roles;
CREATE POLICY "members_select_user_roles" ON user_roles FOR SELECT
TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = user_roles.organization_id
      AND memberships.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "admins_insert_user_roles" ON user_roles;
CREATE POLICY "admins_insert_user_roles" ON user_roles FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = user_roles.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "admins_update_user_roles" ON user_roles;
CREATE POLICY "admins_update_user_roles" ON user_roles FOR UPDATE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = user_roles.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = user_roles.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "admins_delete_user_roles" ON user_roles;
CREATE POLICY "admins_delete_user_roles" ON user_roles FOR DELETE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = user_roles.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. SESSIONS TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid        REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash      text        NOT NULL,
  ip_address      text,
  user_agent      text,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  invalidated_at  timestamptz
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_org ON sessions(organization_id);

DROP POLICY IF EXISTS "users_select_own_sessions" ON sessions;
CREATE POLICY "users_select_own_sessions" ON sessions FOR SELECT
TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own_sessions" ON sessions;
CREATE POLICY "users_insert_own_sessions" ON sessions FOR INSERT
TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_sessions" ON sessions;
CREATE POLICY "users_update_own_sessions" ON sessions FOR UPDATE
TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_delete_own_sessions" ON sessions;
CREATE POLICY "users_delete_own_sessions" ON sessions FOR DELETE
TO authenticated USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. INVITATIONS TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS invitations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           text        NOT NULL,
  invited_by      uuid        NOT NULL REFERENCES auth.users(id),
  role_id         uuid        REFERENCES roles(id),
  status          text        NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
  token_hash      text        NOT NULL,
  expires_at      timestamptz NOT NULL,
  accepted_at     timestamptz,
  accepted_by     uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

DROP POLICY IF EXISTS "members_select_invitations" ON invitations;
CREATE POLICY "members_select_invitations" ON invitations FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = invitations.organization_id
      AND memberships.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "admins_insert_invitations" ON invitations;
CREATE POLICY "admins_insert_invitations" ON invitations FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = invitations.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "admins_update_invitations" ON invitations;
CREATE POLICY "admins_update_invitations" ON invitations FOR UPDATE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = invitations.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = invitations.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "admins_delete_invitations" ON invitations;
CREATE POLICY "admins_delete_invitations" ON invitations FOR DELETE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = invitations.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
  )
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. LOGIN_ATTEMPTS TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS login_attempts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  ip_address  text,
  success     boolean     NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_id);

DROP POLICY IF EXISTS "users_select_own_login_attempts" ON login_attempts;
CREATE POLICY "users_select_own_login_attempts" ON login_attempts FOR SELECT
TO authenticated USING (
  user_id = auth.uid()
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 11. SEED PERMISSIONS CATALOG
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO permissions (name, description, resource, action) VALUES
  ('execution:create',  'Create new executions',         'execution', 'create'),
  ('execution:read',    'Read execution data',           'execution', 'read'),
  ('execution:update',  'Update execution state',        'execution', 'update'),
  ('execution:cancel',  'Cancel running executions',     'execution', 'cancel'),
  ('execution:resume',  'Resume paused executions',      'execution', 'resume'),
  ('workflow:create',   'Create new workflows',          'workflow',  'create'),
  ('workflow:update',   'Modify existing workflows',     'workflow',  'update'),
  ('workflow:publish',  'Publish workflow versions',     'workflow',  'publish'),
  ('workflow:delete',   'Delete workflows',              'workflow',  'delete'),
  ('workflow:read',     'Read workflow definitions',     'workflow',  'read'),
  ('approval:read',     'View approval requests',        'approval',  'read'),
  ('approval:decide',   'Approve or reject requests',    'approval',  'decide'),
  ('telemetry:read',    'Read telemetry data',           'telemetry', 'read'),
  ('memory:read',       'Read memory entries',           'memory',    'read'),
  ('memory:write',      'Write to memory store',         'memory',    'write'),
  ('organization:manage','Manage organization settings', 'organization','manage'),
  ('users:manage',      'Manage organization users',     'users',     'manage'),
  ('api_keys:manage',   'Create and revoke API keys',    'api_keys',  'manage')
ON CONFLICT (name) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- 12. SEED SYSTEM ROLES
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO roles (name, organization_id, description, is_system) VALUES
  ('PLATFORM_ADMIN',      NULL, 'Full platform access',                true),
  ('ORGANIZATION_ADMIN',  NULL, 'Full organization access',            true),
  ('WORKFLOW_EDITOR',     NULL, 'Create and manage workflows',         true),
  ('EXECUTION_OPERATOR',  NULL, 'Execute and manage runtime',          true),
  ('APPROVER',            NULL, 'Approve or reject requests',          true),
  ('VIEWER',              NULL, 'Read-only access',                    true)
ON CONFLICT (name, organization_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- 13. SEED ROLE_PERMISSIONS
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'PLATFORM_ADMIN'
  AND p.name IN (
    'execution:create','execution:read','execution:update','execution:cancel','execution:resume',
    'workflow:create','workflow:update','workflow:publish','workflow:delete','workflow:read',
    'approval:read','approval:decide','telemetry:read','memory:read','memory:write',
    'organization:manage','users:manage','api_keys:manage'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ORGANIZATION_ADMIN'
  AND p.name IN (
    'execution:create','execution:read','execution:update','execution:cancel','execution:resume',
    'workflow:create','workflow:update','workflow:publish','workflow:delete','workflow:read',
    'approval:read','approval:decide','telemetry:read','memory:read','memory:write',
    'organization:manage','users:manage','api_keys:manage'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'WORKFLOW_EDITOR'
  AND p.name IN ('workflow:create','workflow:update','workflow:publish','workflow:read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'EXECUTION_OPERATOR'
  AND p.name IN ('execution:create','execution:read','execution:update','execution:cancel','execution:resume','telemetry:read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'APPROVER'
  AND p.name IN ('approval:read','approval:decide','execution:read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'VIEWER'
  AND p.name IN ('execution:read','workflow:read','approval:read','telemetry:read','memory:read')
ON CONFLICT DO NOTHING;
