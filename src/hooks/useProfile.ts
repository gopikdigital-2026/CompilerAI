import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, upsertProfile } from '../services/profiles.service';
import type { Profile } from '../types/database';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getProfile(user.id)
      .then(setProfile)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const updateProfile = useCallback(
    async (updates: Partial<Omit<Profile, 'id' | 'created_at'>>) => {
      if (!user) return;
      const updated = await upsertProfile({ id: user.id, ...updates });
      setProfile(updated);
      return updated;
    },
    [user?.id],
  );

  return { profile, loading, error, updateProfile };
}
