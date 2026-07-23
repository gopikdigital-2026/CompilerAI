import type { ApiKey, ApiKeyScope } from './ApiKeyModels';
import { API_KEY_PREFIX, validateScopes, isApiKeyActive } from './ApiKeyModels';
import type { IApiKeyRepository } from '../repositories/RepositoryInterfaces';
import type { ITokenGenerator } from '../adapters/SecurityAdapters';
import { ApiKeyNotFoundError, ApiKeyRevokedError } from '../adapters/IdentityErrors';

export interface CreateApiKeyRequest {
  name: string;
  organizationId: string;
  createdByUserId: string;
  scopes: ApiKeyScope[];
  expiresAt: string | null;
}

export interface ApiKeyCredential {
  apiKey: ApiKey;
  rawKey: string;
}

export class ApiKeyService {
  constructor(
    private readonly repo: IApiKeyRepository,
    private readonly tokenGen: ITokenGenerator,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async create(request: CreateApiKeyRequest): Promise<ApiKeyCredential> {
    if (!validateScopes(request.scopes)) {
      throw new Error(`Invalid scopes: ${request.scopes.join(', ')}`);
    }

    const { token, hash, preview } = this.tokenGen.generate(API_KEY_PREFIX);
    const now = this.clock();
    const apiKey: ApiKey = {
      id: this.idGen(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: request.organizationId,
      name: request.name,
      keyHash: hash,
      keyPreview: preview,
      scopes: request.scopes,
      status: 'ACTIVE',
      createdByUserId: request.createdByUserId,
      expiresAt: request.expiresAt,
      lastUsedAt: null,
      revokedAt: null,
      revokedByUserId: null,
    };
    const saved = await this.repo.create(apiKey);
    return { apiKey: saved, rawKey: token };
  }

  async findById(id: string): Promise<ApiKey> {
    const key = await this.repo.findById(id);
    if (!key) throw new ApiKeyNotFoundError(`API key not found: ${id}`);
    return key;
  }

  async findByOrganization(organizationId: string): Promise<ApiKey[]> {
    return this.repo.findByOrganization(organizationId);
  }

  async authenticate(rawKey: string): Promise<ApiKey> {
    const hash = this.tokenGen.hash(rawKey);
    const apiKey = await this.repo.findByHash(hash);
    if (!apiKey) throw new ApiKeyNotFoundError('Invalid API key');
    const now = this.clock();
    if (!isApiKeyActive(apiKey, now)) {
      throw new ApiKeyRevokedError(`API key ${apiKey.id} is not active`);
    }
    const updated: ApiKey = {
      ...apiKey,
      lastUsedAt: now,
      version: apiKey.version + 1,
      updatedAt: now,
    };
    return this.repo.update(updated);
  }

  async revoke(id: string, revokedByUserId: string): Promise<ApiKey> {
    const apiKey = await this.findById(id);
    const now = this.clock();
    const updated: ApiKey = {
      ...apiKey,
      status: 'REVOKED',
      revokedAt: now,
      revokedByUserId,
      version: apiKey.version + 1,
      updatedAt: now,
    };
    return this.repo.update(updated);
  }

  async rotate(id: string, revokedByUserId: string): Promise<ApiKeyCredential> {
    const oldKey = await this.findById(id);
    await this.revoke(id, revokedByUserId);
    return this.create({
      name: oldKey.name,
      organizationId: oldKey.organizationId,
      createdByUserId: revokedByUserId,
      scopes: oldKey.scopes,
      expiresAt: oldKey.expiresAt,
    });
  }

  async assertActive(id: string): Promise<ApiKey> {
    const apiKey = await this.findById(id);
    const now = this.clock();
    if (!isApiKeyActive(apiKey, now)) {
      throw new ApiKeyRevokedError(`API key ${id} is not active`);
    }
    return apiKey;
  }
}
