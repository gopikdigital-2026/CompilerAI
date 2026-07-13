import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { getProfile, upsertProfile } from '../services/profiles.service';
import type { Profile } from '../types/database';

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const userRef = useRef(user);
  userRef.current = user;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getProfile(userId)
      .then(setProfile)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const updateProfile = useCallback(
    async (updates: Partial<Omit<Profile, 'id' | 'created_at'>>) => {
      const currentUser = userRef.current;
      if (!currentUser) return;
      const updated = await upsertProfile({ id: currentUser.id, ...updates });
      setProfile(updated);
      return updated;
    },
    [],
  );

  return { profile, loading, error, updateProfile };
}
