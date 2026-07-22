// ─── API Key domain models ──────────────────────────────────────────────────────

export type ApiKeyScope =
  | 'execution:run' | 'execution:read' | 'execution:cancel'
  | 'workflow:read' | 'workflow:write'
  | 'approval:read' | 'approval:decide'
  | 'telemetry:read'
  | 'memory:read' | 'memory:write'
  | 'admin';

export const ALL_API_KEY_SCOPES: readonly ApiKeyScope[] = [
  'execution:run', 'execution:read', 'execution:cancel',
  'workflow:read', 'workflow:write',
  'approval:read', 'approval:decide',
  'telemetry:read',
  'memory:read', 'memory:write',
  'admin',
];

export interface ApiKey {
  apiKeyId:        string;
  organizationId:  string;
  name:            string;
  keyPreview:      string;
  keyHash:         string;
  scopes:          ApiKeyScope[];
  createdBy:       string;
  expiresAt:       string | null;
  revokedAt:       string | null;
  lastUsedAt:      string | null;
  createdAt:       string;
}

export interface ApiKeyWithSecret extends ApiKey {
  secretKey: string;
}

export function isValidScope(scope: string): boolean {
  return ALL_API_KEY_SCOPES.includes(scope as ApiKeyScope);
}

export function validateScopes(scopes: string[]): ApiKeyScope[] {
  const valid: ApiKeyScope[] = [];
  for (const s of scopes) {
    if (!isValidScope(s)) throw new Error(`Invalid API key scope: ${s}`);
    valid.push(s as ApiKeyScope);
  }
  return valid;
}

export function hasScope(apiKey: ApiKey, requiredScope: ApiKeyScope): boolean {
  if (apiKey.scopes.includes('admin')) return true;
  return apiKey.scopes.includes(requiredScope);
}
