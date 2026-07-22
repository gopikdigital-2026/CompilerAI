// ─── Storage abstraction ────────────────────────────────────────────────────────
// Prepared for future file/blob storage adapters (S3, GCS, etc.)

export interface IStorageProvider {
  upload(key: string, data: Buffer, contentType?: string): Promise<string>;
  download(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, expiryMs?: number): Promise<string>;
}

// ── In-memory storage (for testing) ─────────────────────────────────────────────

export class InMemoryStorageProvider implements IStorageProvider {
  private readonly store = new Map<string, { data: Buffer; contentType: string }>();

  async upload(key: string, data: Buffer, contentType = 'application/octet-stream'): Promise<string> {
    this.store.set(key, { data, contentType });
    return key;
  }

  async download(key: string): Promise<Buffer | null> {
    const entry = this.store.get(key);
    return entry?.data ?? null;
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async getSignedUrl(key: string, _expiryMs?: number): Promise<string> {
    return `memory://storage/${key}`;
  }

  clear(): void { this.store.clear(); }
  size(): number { return this.store.size; }
}
