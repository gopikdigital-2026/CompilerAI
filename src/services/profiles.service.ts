import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
};

export const upsertProfile = async (
  profile: { id: string } & Partial<Omit<Profile, 'id' | 'created_at'>>,
): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ ...profile, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
};
