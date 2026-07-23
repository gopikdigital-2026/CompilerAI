import type { ICredentialStore, CredentialRecord, SaveCredentialRequest } from './CredentialStore';
import type { ICredentialEncryptionProvider } from './CredentialEncryptionProvider';
import type { ConnectorId, UUID } from '../types/index';

export interface ResolvedCredentials {
  credentialType: CredentialRecord['credentialType'];
  data: Record<string, unknown>;
  expiresAt: string | null;
  scopes: string[];
}

export class CredentialResolver {
  constructor(
    private readonly store: ICredentialStore,
    private readonly encryption: ICredentialEncryptionProvider,
  ) {}

  async resolve(connectorId: ConnectorId, organizationId: UUID, userId?: UUID | null): Promise<ResolvedCredentials | null> {
    const record = await this.store.get(connectorId, organizationId, userId ?? null);
    if (!record) return null;

    const decrypted = this.encryption.decrypt(record.encryptedData);
    const data = JSON.parse(decrypted) as Record<string, unknown>;

    return {
      credentialType: record.credentialType,
      data,
      expiresAt: record.expiresAt,
      scopes: record.scopes,
    };
  }

  async storeCredentials(
    connectorId: ConnectorId,
    organizationId: UUID,
    credentialType: CredentialRecord['credentialType'],
    data: Record<string, unknown>,
    options?: {
      userId?: UUID | null;
      expiresAt?: string | null;
      scopes?: string[];
      metadata?: Record<string, unknown>;
    },
  ): Promise<CredentialRecord> {
    const encrypted = this.encryption.encrypt(JSON.stringify(data));
    const request: SaveCredentialRequest = {
      connectorId,
      organizationId,
      userId: options?.userId ?? null,
      credentialType,
      encryptedData: encrypted,
      expiresAt: options?.expiresAt ?? null,
      scopes: options?.scopes ?? [],
      metadata: options?.metadata ?? {},
    };
    return this.store.save(request);
  }

  async rotate(
    connectorId: ConnectorId,
    organizationId: UUID,
    newData: Record<string, unknown>,
    newExpiresAt?: string | null,
  ): Promise<CredentialRecord> {
    const encrypted = this.encryption.encrypt(JSON.stringify(newData));
    return this.store.rotate(connectorId, organizationId, encrypted, newExpiresAt);
  }

  async delete(connectorId: ConnectorId, organizationId: UUID, userId?: UUID | null): Promise<boolean> {
    return this.store.delete(connectorId, organizationId, userId ?? null);
  }
}
