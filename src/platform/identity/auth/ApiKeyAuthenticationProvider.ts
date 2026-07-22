// ─── API Key Authentication Provider ────────────────────────────────────────────

import type { IApiKeyValidator, ApiKeyValidationResult } from './AuthInterfaces';
import type { ApiKey, ApiKeyScope } from '../api-keys/ApiKeyModels';
import { sha256Hex } from './PasswordHasher';
import { ApiKeyRevokedError, ApiKeyExpiredError } from '../errors/IdentityErrors';

interface StoredApiKey extends ApiKey {
  secretKeyHash: string;
}

export class ApiKeyValidator implements IApiKeyValidator {
  private readonly keysByHash = new Map<string, StoredApiKey>();
  private readonly keysById = new Map<string, StoredApiKey>();
  private readonly clock: () => string;

  constructor(clock: () => string) {
    this.clock = clock;
  }

  storeApiKey(apiKey: StoredApiKey): void {
    this.keysByHash.set(apiKey.secretKeyHash, apiKey);
    this.keysById.set(apiKey.apiKeyId, apiKey);
  }

  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult | null> {
    if (!apiKey.startsWith('ck_')) return null;
    const keyHash = await sha256Hex(apiKey);
    const stored = this.keysByHash.get(keyHash);
    if (!stored) return null;

    if (stored.revokedAt !== null) throw new ApiKeyRevokedError();
    if (stored.expiresAt && new Date(stored.expiresAt).getTime() < new Date(this.clock()).getTime()) {
      throw new ApiKeyExpiredError();
    }

    stored.lastUsedAt = this.clock();
    return {
      apiKeyId: stored.apiKeyId,
      actorId: stored.createdBy,
      organizationId: stored.organizationId,
      scopes: stored.scopes as string[] as ApiKeyScope[],
    };
  }

  revokeApiKey(apiKeyId: string): void {
    const stored = this.keysById.get(apiKeyId);
    if (stored) {
      stored.revokedAt = this.clock();
      this.keysByHash.delete(stored.secretKeyHash);
    }
  }

  getApiKey(apiKeyId: string): StoredApiKey | undefined {
    return this.keysById.get(apiKeyId);
  }

  listApiKeys(organizationId: string): StoredApiKey[] {
    return Array.from(this.keysById.values()).filter(k => k.organizationId === organizationId);
  }
}
