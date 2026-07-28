import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
}

interface FeatureFlagsContextValue {
  flags: Record<string, boolean>;
  loading: boolean;
  isEnabled: (key: string) => boolean;
  refresh: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('feature_flags').select('key, enabled');
      if (error) {
        logger.supabaseError('fetchFeatureFlags', error);
        return;
      }
      const map: Record<string, boolean> = {};
      for (const row of data ?? []) {
        map[(row as { key: string; enabled: boolean }).key] = (row as { key: string; enabled: boolean }).enabled;
      }
      setFlags(map);
    } catch (e) {
      logger.error('featureFlags_fetch_failed', { error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const isEnabled = useCallback(
    (key: string): boolean => {
      if (key in flags) return flags[key];
      return true;
    },
    [flags]
  );

  return (
    <FeatureFlagsContext.Provider value={{ flags, loading, isEnabled, refresh }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagsContextValue {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  return ctx;
}
