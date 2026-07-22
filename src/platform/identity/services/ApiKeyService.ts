// ─── API Key service ────────────────────────────────────────────────────────────

import type { IApiKeyRepository } from '../repositories/RepositoryInterfaces';
import type { ApiKey, ApiKeyWithSecret } from '../api-keys/ApiKeyModels';
import { validateScopes } from '../api-keys/ApiKeyModels';
import { sha256Hex } from '../auth/PasswordHasher';

export class ApiKeyService {
  constructor(
    private apiKeyRepo: IApiKeyRepository,
    _idGen: () => string,
    _clock: () => string,
  ) {}

  async createApiKey(orgId: string, name: string, scopes: string[], createdBy: string, expiresInSeconds?: number): Promise<ApiKeyWithSecret> {
    const validScopes = validateScopes(scopes);
    const secretKey = `ck_live_${this.randomKey(32)}`;
    const keyHash = await sha256Hex(secretKey);
    const keyPreview = `ck_live_${'•'.repeat(8)}${secretKey.slice(-4)}`;
    const expiresAt = expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000).toISOString() : null;

    const apiKey = await this.apiKeyRepo.create(orgId, name, keyPreview, keyHash, validScopes, createdBy, expiresAt);
    return { ...apiKey, secretKey };
  }

  async revokeApiKey(apiKeyId: string): Promise<void> {
    await this.apiKeyRepo.revoke(apiKeyId);
  }

  async regenerateApiKey(apiKeyId: string): Promise<ApiKeyWithSecret> {
    const existing = await this.apiKeyRepo.findById(apiKeyId);
    if (!existing) throw new Error(`API key ${apiKeyId} not found`);
    await this.apiKeyRepo.revoke(apiKeyId);
    return this.createApiKey(existing.organizationId, existing.name, existing.scopes, existing.createdBy,
      existing.expiresAt ? Math.floor((new Date(existing.expiresAt).getTime() - Date.now()) / 1000) : undefined);
  }

  async listApiKeys(orgId: string): Promise<ApiKey[]> {
    return this.apiKeyRepo.listByOrganization(orgId);
  }

  async getApiKey(apiKeyId: string): Promise<ApiKey | null> {
    return this.apiKeyRepo.findById(apiKeyId);
  }

  private randomKey(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}
