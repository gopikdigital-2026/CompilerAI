import { useCallback, useEffect, useState } from 'react';
import { getApiKeys, createApiKey, deleteApiKey } from '../services/apiKeys.service';
import type { ApiKey } from '../types/database';

export function useApiKeys(organizationId: string | undefined) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) { setApiKeys([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    getApiKeys(organizationId)
      .then(setApiKeys)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [organizationId]);

  const create = useCallback(
    async (name: string): Promise<{ apiKey: ApiKey; secret: string } | undefined> => {
      if (!organizationId) return;
      const result = await createApiKey(organizationId, name);
      setApiKeys((prev) => [result.apiKey, ...prev]);
      return result;
    },
    [organizationId],
  );

  const revoke = useCallback(async (keyId: string) => {
    await deleteApiKey(keyId);
    setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
  }, []);

  return { apiKeys, loading, error, create, revoke };
}
