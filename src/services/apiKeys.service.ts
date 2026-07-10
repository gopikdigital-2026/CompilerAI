import { supabase } from '../lib/supabase';
import type { ApiKey } from '../types/database';

export const getApiKeys = async (organizationId: string): Promise<ApiKey[]> => {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, organization_id, name, key_preview, created_by, last_used_at, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApiKey[];
};

const generateKeyPreview = (): { preview: string; hash: string } => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const rand = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const suffix = rand(8);
  const full = `rc_live_${rand(16)}${suffix}`;
  return { preview: `rc_live_sk_••••••••••••${suffix}`, hash: full };
};

export const createApiKey = async (organizationId: string, name: string): Promise<ApiKey> => {
  const { preview, hash } = generateKeyPreview();
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      organization_id: organizationId,
      name,
      key_preview: preview,
      key_hash: hash,
    })
    .select('id, organization_id, name, key_preview, created_by, last_used_at, created_at')
    .single();
  if (error) throw error;
  return data as ApiKey;
};

export const deleteApiKey = async (keyId: string): Promise<void> => {
  const { error } = await supabase.from('api_keys').delete().eq('id', keyId);
  if (error) throw error;
};
