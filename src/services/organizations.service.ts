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
  return ((data ?? []) as Record<string, unknown>[]).map((m) => ({
    ...(m.organizations as Organization),
    role: m.role as OrgWithRole['role'],
  }));
};

export const updateOrganization = async (
  id: string,
  updates: Partial<Pick<Organization, 'name' | 'logo_url'>> & {
    sector?: string;
    company_size?: string;
    country?: string;
    timezone?: string;
  },
): Promise<Organization> => {
  const settingsUpdate: Record<string, unknown> = {};
  if (updates.sector !== undefined) settingsUpdate.sector = updates.sector;
  if (updates.company_size !== undefined) settingsUpdate.company_size = updates.company_size;
  if (updates.country !== undefined) settingsUpdate.country = updates.country;
  if (updates.timezone !== undefined) settingsUpdate.timezone = updates.timezone;

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.logo_url !== undefined) dbUpdates.logo_url = updates.logo_url;

  if (Object.keys(settingsUpdate).length > 0) {
    const { data: current } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', id)
      .maybeSingle();
    dbUpdates.settings = { ...(current?.settings ?? {}), ...settingsUpdate };
  }

  const { data, error } = await supabase
    .from('organizations')
    .update(dbUpdates)
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
  return ((data ?? []) as Record<string, unknown>[]).map((m) => ({
    id: m.id as string,
    role: m.role as OrgMember['role'],
    created_at: m.created_at as string,
    profile: m.profiles as OrgMember['profile'],
  }));
};

export const updateMemberRole = async (membershipId: string, role: string): Promise<void> => {
  const { error } = await supabase
    .from('memberships')
    .update({ role })
    .eq('id', membershipId);
  if (error) throw error;
};

export const removeMember = async (membershipId: string): Promise<void> => {
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('id', membershipId);
  if (error) throw error;
};
