export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  slug: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED' | null;
  settings: Record<string, unknown> | null;
  limits: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  job_title: string;
  preferences: ProfilePreferences | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfilePreferences {
  language?: string;
  timezone?: string;
  ai_model?: string;
  ai_temperature?: number;
  ai_max_tokens?: number;
  notifications?: NotificationPreferences;
}

export interface NotificationPreferences {
  email_enabled?: boolean;
  in_app_enabled?: boolean;
  execution_completed?: boolean;
  critical_errors?: boolean;
  automations?: boolean;
  team_activity?: boolean;
  security_alerts?: boolean;
  product_updates?: boolean;
}

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: MemberRole;
  created_at: string;
}

export interface OrgMember {
  id: string;
  role: MemberRole;
  created_at: string;
  profile: Profile;
}

export interface OrgWithRole extends Organization {
  role: MemberRole;
}

export interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_preview: string;
  key_hash: string;
  scopes: string[] | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_by: string;
  last_used_at: string | null;
  created_at: string;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  invited_by: string;
  accepted_by: string | null;
  token_hash: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  invalidated_at: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  organization_id: string | null;
  is_system: boolean;
  description: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  organization_id: string;
  role_id: string;
  created_at: string;
}
