# Credentials

## Overview

The credential management layer provides secure storage, encryption, and resolution of connector credentials. It uses AES-256-GCM encryption and supports per-organization, per-user credential isolation.

## Architecture

```
CredentialResolver
  ├── ICredentialStore (storage backend)
  └── ICredentialEncryptionProvider (encryption)
```

## Credential Store

### Interface

```typescript
interface ICredentialStore {
  save(request: SaveCredentialRequest): Promise<CredentialRecord>;
  get(connectorId: string, organizationId: string, userId?: string | null): Promise<CredentialRecord | null>;
  delete(connectorId: string, organizationId: string, userId?: string | null): Promise<boolean>;
  exists(connectorId: string, organizationId: string, userId?: string | null): Promise<boolean>;
  rotate(connectorId: string, organizationId: string, newEncryptedData: string, newExpiresAt?: string | null): Promise<CredentialRecord>;
  listByOrganization(organizationId: string): Promise<CredentialRecord[]>;
}
```

### In-Memory Implementation

```typescript
import { InMemoryCredentialStore } from '@compilerai/connectors';

const store = new InMemoryCredentialStore();

await store.save({
  connectorId: 'slack',
  organizationId: 'org-1',
  credentialType: 'oauth2',
  encryptedData: 'encrypted-blob',
  expiresAt: '2026-12-31T00:00:00.000Z',
  scopes: ['channels:read', 'chat:write'],
});

const record = await store.get('slack', 'org-1');
```

### Credential Record

```typescript
interface CredentialRecord {
  id: string;
  connectorId: string;
  organizationId: string;
  userId: string | null;
  credentialType: 'oauth2' | 'api_key' | 'bearer' | 'basic';
  encryptedData: string;
  expiresAt: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

## Encryption

### AES-256-GCM

The `DevelopmentCredentialEncryptionProvider` uses Node.js `crypto` with:

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key derivation**: scrypt with random salt
- **IV**: 12-byte random initialization vector
- **Auth tag**: 16-byte GCM authentication tag
- **Format**: `base64(salt + iv + authTag + ciphertext)`

```typescript
import { DevelopmentCredentialEncryptionProvider } from '@compilerai/connectors';

const encryption = new DevelopmentCredentialEncryptionProvider('my-secret-key');

const encrypted = encryption.encrypt('{"accessToken":"secret"}');
const decrypted = encryption.decrypt(encrypted); // original string

// Rotate encryption key
encryption.rotateKey('new-secret-key');
```

### Security Notes

- The `DevelopmentCredentialEncryptionProvider` is for development/testing only
- Production implementations should use a KMS (AWS KMS, GCP KMS, HashiCorp Vault)
- Each encryption produces different ciphertext due to random IV and salt
- Key rotation invalidates previously encrypted data

## Credential Resolver

The `CredentialResolver` combines the store and encryption provider:

```typescript
import { CredentialResolver, InMemoryCredentialStore, DevelopmentCredentialEncryptionProvider } from '@compilerai/connectors';

const resolver = new CredentialResolver(store, encryption);

// Store credentials (encrypts automatically)
await resolver.storeCredentials('slack', 'org-1', 'oauth2', {
  accessToken: 'xoxb-123',
  refreshToken: 'xoxr-456',
  tokenType: 'Bearer',
  expiresAt: '2026-12-31T00:00:00.000Z',
  scope: 'channels:read chat:write',
});

// Resolve credentials (decrypts automatically)
const resolved = await resolver.resolve('slack', 'org-1');
// { credentialType: 'oauth2', data: { accessToken: 'xoxb-123', ... }, expiresAt, scopes }

// Rotate credentials
await resolver.rotate('slack', 'org-1', { accessToken: 'xoxb-new' });

// Delete credentials
await resolver.delete('slack', 'org-1');
```

## Credential Isolation

Credentials are isolated by `connectorId + organizationId + userId`:

- Organization-level credentials: `userId = null`
- User-level credentials: `userId = 'user-123'`
- Lookup falls back from user-level to organization-level
