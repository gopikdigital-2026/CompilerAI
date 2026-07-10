import { useCallback, useEffect, useState } from 'react';
import { getApiKeys, createApiKey, deleteApiKey } from '../services/apiKeys.service';
import type { ApiKey } from '../types/database';

export function useApiKeys(organizationId: string | undefined) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) { setApiKeys([]); setLoading(false); return; }
    setLoading(true);
    getApiKeys(organizationId)
      .then(setApiKeys)
      .finally(() => setLoading(false));
  }, [organizationId]);

  const create = useCallback(
    async (name: string): Promise<ApiKey | undefined> => {
      if (!organizationId) return;
      const key = await createApiKey(organizationId, name);
      setApiKeys((prev) => [key, ...prev]);
      return key;
    },
    [organizationId],
  );

  const revoke = useCallback(async (keyId: string) => {
    await deleteApiKey(keyId);
    setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
  }, []);

  return { apiKeys, loading, create, revoke };
}
