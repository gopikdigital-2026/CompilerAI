import { supabase } from '../lib/supabase';
import type { Organization, OrgWithRole, OrgMember } from '../types/database';

export const createOrganizationWithOwner = async (orgName: string): Promise<Organization> => {
  const { data, error } = await supabase.rpc('create_organization_with_owner', { org_name: orgName });
  if (error) throw error;
  return data as Organization;
};

export const getMyOrganizations = async (): Promise<OrgWithRole[]> => {
  const { data, error } = await supabase
    .from('memberships')
    .select('role, organizations(*)')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map((m) => ({
    ...(m.organizations as Organization),
    role: m.role as OrgWithRole['role'],
  }));
};

export const updateOrganization = async (
  id: string,
  updates: Partial<Pick<Organization, 'name' | 'logo_url'>>,
): Promise<Organization> => {
  const { data, error } = await supabase
    .from('organizations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Organization;
};

export const getOrgMembers = async (organizationId: string): Promise<OrgMember[]> => {
  const { data, error } = await supabase
    .from('memberships')
    .select('id, role, created_at, profiles(id, full_name, avatar_url, job_title)')
    .eq('organization_id', organizationId);
  if (error) throw error;
  return ((data ?? []) as any[]).map((m) => ({
    id: m.id as string,
    role: m.role as OrgMember['role'],
    created_at: m.created_at as string,
    profile: m.profiles as OrgMember['profile'],
  }));
};
