export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  job_title: string;
  created_at: string;
  updated_at: string;
}

export type MemberRole = 'owner' | 'admin' | 'member';

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
  created_by: string;
  last_used_at: string | null;
  created_at: string;
}
