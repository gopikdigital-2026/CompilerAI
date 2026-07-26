import type { ISecretStore, SecretRecord, SecretType } from '../models.js';

let secretCounter = 0;

export class InMemorySecretStore implements ISecretStore {
  private readonly secrets = new Map<string, SecretRecord>();
  private readonly nameIndex = new Map<string, string>();

  store(secret: SecretRecord): void {
    this.secrets.set(secret.id, secret);
    this.nameIndex.set(`${secret.organizationId}:${secret.name}`, secret.id);
  }

  retrieve(id: string): SecretRecord | undefined {
    return this.secrets.get(id);
  }

  retrieveByName(name: string, organizationId: string): SecretRecord | undefined {
    const id = this.nameIndex.get(`${organizationId}:${name}`);
    if (!id) return undefined;
    return this.secrets.get(id);
  }

  delete(id: string): boolean {
    const secret = this.secrets.get(id);
    if (!secret) return false;
    this.secrets.delete(id);
    this.nameIndex.delete(`${secret.organizationId}:${secret.name}`);
    return true;
  }

  list(organizationId: string): SecretRecord[] {
    return Array.from(this.secrets.values()).filter((s) => s.organizationId === organizationId);
  }

  update(id: string, updates: Partial<SecretRecord>): SecretRecord | undefined {
    const existing = this.secrets.get(id);
    if (!existing) return undefined;
    const updated: SecretRecord = { ...existing, ...updates, id: existing.id, updatedAt: new Date().toISOString() };
    this.secrets.set(id, updated);
    return updated;
  }
}

export class SecretsManager {
  private readonly store: ISecretStore;
  private readonly encryptFn: (plaintext: string) => string;
  private readonly decryptFn: (ciphertext: string) => string;

  constructor(
    store: ISecretStore,
    encryptFn: (plaintext: string) => string,
    decryptFn: (ciphertext: string) => string,
  ) {
    this.store = store;
    this.encryptFn = encryptFn;
    this.decryptFn = decryptFn;
  }

  storeSecret(
    name: string,
    value: string,
    type: SecretType,
    organizationId: string,
    metadata?: Record<string, unknown>,
  ): SecretRecord {
    const id = `secret-${++secretCounter}`;
    const now = new Date().toISOString();
    const secret: SecretRecord = {
      id,
      name,
      type,
      organizationId,
      encryptedValue: this.encryptFn(value),
      createdAt: now,
      updatedAt: now,
      metadata: metadata ?? {},
    };
    this.store.store(secret);
    return secret;
  }

  getSecret(id: string): string | undefined {
    const secret = this.store.retrieve(id);
    if (!secret) return undefined;
    return this.decryptFn(secret.encryptedValue);
  }

  getSecretByName(name: string, organizationId: string): string | undefined {
    const secret = this.store.retrieveByName(name, organizationId);
    if (!secret) return undefined;
    return this.decryptFn(secret.encryptedValue);
  }

  deleteSecret(id: string): boolean {
    return this.store.delete(id);
  }

  listSecrets(organizationId: string): SecretRecord[] {
    return this.store.list(organizationId);
  }

  rotateSecret(id: string, newValue: string): SecretRecord | undefined {
    const existing = this.store.retrieve(id);
    if (!existing) return undefined;
    return this.store.update(id, {
      encryptedValue: this.encryptFn(newValue),
      lastRotatedAt: new Date().toISOString(),
    });
  }

  getSecretRecord(id: string): SecretRecord | undefined {
    return this.store.retrieve(id);
  }
}
