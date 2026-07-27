import { supabase } from '../lib/supabase';
import type { ApiKey } from '../types/database';

export const getApiKeys = async (organizationId: string): Promise<ApiKey[]> => {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, organization_id, name, key_preview, created_by, last_used_at, created_at, expires_at, revoked_at, scopes')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApiKey[];
};

export const createApiKey = async (organizationId: string, name: string): Promise<{ apiKey: ApiKey; secret: string }> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('No authenticated session');

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-api-key`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ organizationId, name }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Request failed (${response.status})`);
  }

  const result = await response.json();
  if (!result.apiKey || !result.secret) {
    throw new Error('Invalid response from key creation service');
  }

  return { apiKey: result.apiKey as ApiKey, secret: result.secret as string };
};

export const deleteApiKey = async (keyId: string): Promise<void> => {
  const { error } = await supabase.from('api_keys').delete().eq('id', keyId);
  if (error) throw error;
};
