export type ProviderId = 'google' | 'github';

export type ProviderStatus = 'available' | 'not_configured';

export interface AuthProviderConfig {
  id: ProviderId;
  label: string;
  status: ProviderStatus;
}

const PROVIDER_CONFIG: Record<ProviderId, AuthProviderConfig> = {
  google: {
    id: 'google',
    label: 'Google',
    status: 'not_configured',
  },
  github: {
    id: 'github',
    label: 'GitHub',
    status: 'not_configured',
  },
};

export function getAuthProviders(): AuthProviderConfig[] {
  return Object.values(PROVIDER_CONFIG);
}

export function isProviderAvailable(id: ProviderId): boolean {
  return PROVIDER_CONFIG[id]?.status === 'available';
}

export function getAvailableProviders(): AuthProviderConfig[] {
  return getAuthProviders().filter((p) => p.status === 'available');
}

export function getVisibleProviders(): AuthProviderConfig[] {
  return getAuthProviders().filter((p) => p.status === 'available' || p.status === 'not_configured');
}
