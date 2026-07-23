import type { ICredentialStore, CredentialRecord, SaveCredentialRequest } from './CredentialStore';
import type { ConnectorId, UUID, ISOString } from '../types/index';

export class InMemoryCredentialStore implements ICredentialStore {
  private records = new Map<string, CredentialRecord>();
  private idCounter = 0;

  private makeKey(connectorId: ConnectorId, organizationId: UUID, userId?: UUID | null): string {
    return `${connectorId}:${organizationId}:${userId ?? '*'}`;
  }

  async save(request: SaveCredentialRequest): Promise<CredentialRecord> {
    const now = new Date().toISOString();
    const key = this.makeKey(request.connectorId, request.organizationId, request.userId ?? null);
    const existing = this.records.get(key);

    const record: CredentialRecord = {
      id: existing?.id ?? `cred_${++this.idCounter}`,
      connectorId: request.connectorId,
      organizationId: request.organizationId,
      userId: request.userId ?? null,
      credentialType: request.credentialType,
      encryptedData: request.encryptedData,
      expiresAt: request.expiresAt ?? null,
      scopes: request.scopes ?? [],
      metadata: request.metadata ?? {},
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.records.set(key, record);
    return record;
  }

  async get(connectorId: ConnectorId, organizationId: UUID, userId?: UUID | null): Promise<CredentialRecord | null> {
    const key = this.makeKey(connectorId, organizationId, userId ?? null);
    const record = this.records.get(key);
    if (record) return record;
    const orgKey = this.makeKey(connectorId, organizationId, null);
    return this.records.get(orgKey) ?? null;
  }

  async delete(connectorId: ConnectorId, organizationId: UUID, userId?: UUID | null): Promise<boolean> {
    const key = this.makeKey(connectorId, organizationId, userId ?? null);
    const deleted = this.records.delete(key);
    if (!deleted) {
      const orgKey = this.makeKey(connectorId, organizationId, null);
      return this.records.delete(orgKey);
    }
    return true;
  }

  async exists(connectorId: ConnectorId, organizationId: UUID, userId?: UUID | null): Promise<boolean> {
    const record = await this.get(connectorId, organizationId, userId ?? null);
    return record !== null;
  }

  async rotate(
    connectorId: ConnectorId,
    organizationId: UUID,
    newEncryptedData: string,
    newExpiresAt?: ISOString | null,
  ): Promise<CredentialRecord> {
    const record = await this.get(connectorId, organizationId);
    if (!record) {
      throw new Error(`Credential not found for ${connectorId}:${organizationId}`);
    }
    const updated: CredentialRecord = {
      ...record,
      encryptedData: newEncryptedData,
      expiresAt: newExpiresAt ?? record.expiresAt,
      updatedAt: new Date().toISOString(),
    };
    const key = this.makeKey(connectorId, organizationId, record.userId);
    this.records.set(key, updated);
    return updated;
  }

  async listByOrganization(organizationId: UUID): Promise<CredentialRecord[]> {
    return Array.from(this.records.values()).filter((r) => r.organizationId === organizationId);
  }

  clear(): void {
    this.records.clear();
    this.idCounter = 0;
  }
}
