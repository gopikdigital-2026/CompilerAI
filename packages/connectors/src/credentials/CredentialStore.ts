import type { ConnectorId, UUID, ISOString, Metadata } from '../types/index';

export type CredentialType = 'oauth2' | 'api_key' | 'bearer' | 'basic';

export interface CredentialRecord {
  id: string;
  connectorId: ConnectorId;
  organizationId: UUID;
  userId: UUID | null;
  credentialType: CredentialType;
  encryptedData: string;
  expiresAt: ISOString | null;
  scopes: string[];
  metadata: Metadata;
  createdAt: ISOString;
  updatedAt: ISOString;
}

export interface SaveCredentialRequest {
  connectorId: ConnectorId;
  organizationId: UUID;
  userId?: UUID | null;
  credentialType: CredentialType;
  encryptedData: string;
  expiresAt?: ISOString | null;
  scopes?: string[];
  metadata?: Metadata;
}

export interface ICredentialStore {
  save(request: SaveCredentialRequest): Promise<CredentialRecord>;
  get(connectorId: ConnectorId, organizationId: UUID, userId?: UUID | null): Promise<CredentialRecord | null>;
  delete(connectorId: ConnectorId, organizationId: UUID, userId?: UUID | null): Promise<boolean>;
  exists(connectorId: ConnectorId, organizationId: UUID, userId?: UUID | null): Promise<boolean>;
  rotate(connectorId: ConnectorId, organizationId: UUID, newEncryptedData: string, newExpiresAt?: ISOString | null): Promise<CredentialRecord>;
  listByOrganization(organizationId: UUID): Promise<CredentialRecord[]>;
}
