// ─── Secret management ──────────────────────────────────────────────────────────
// No secrets are logged or exposed via API.

import { SecretProviderError } from '../errors/InfrastructureErrors';

export interface ISecretProvider {
  getSecret(key: string): Promise<string | null>;
  listSecretNames(): string[];
  validate(): Promise<string[]>;
}

// ── Environment secret provider ─────────────────────────────────────────────────

export class EnvironmentSecretProvider implements ISecretProvider {
  private readonly env: Record<string, string | undefined>;
  private readonly required: string[];

  constructor(env: Record<string, string | undefined>, required: string[] = []) {
    this.env = env;
    this.required = required;
  }

  async getSecret(key: string): Promise<string | null> {
    const value = this.env[key];
    if (!value) return null;
    return value;
  }

  listSecretNames(): string[] {
    return Object.keys(this.env).filter(k =>
      k.includes('SECRET') || k.includes('KEY') || k.includes('TOKEN') || k.includes('PASSWORD')
    );
  }

  async validate(): Promise<string[]> {
    const missing: string[] = [];
    for (const key of this.required) {
      const value = this.env[key];
      if (!value) missing.push(key);
    }
    return missing;
  }
}

// ── In-memory secret provider ───────────────────────────────────────────────────

export class InMemorySecretProvider implements ISecretProvider {
  private readonly secrets = new Map<string, string>();
  private readonly required: string[];

  constructor(required: string[] = []) {
    this.required = required;
  }

  setSecret(key: string, value: string): void {
    this.secrets.set(key, value);
  }

  async getSecret(key: string): Promise<string | null> {
    return this.secrets.get(key) ?? null;
  }

  listSecretNames(): string[] {
    return Array.from(this.secrets.keys());
  }

  async validate(): Promise<string[]> {
    const missing: string[] = [];
    for (const key of this.required) {
      if (!this.secrets.has(key)) missing.push(key);
    }
    return missing;
  }
}

// ── Secret validation at startup ────────────────────────────────────────────────

export async function validateSecretsOrThrow(provider: ISecretProvider): Promise<void> {
  const missing = await provider.validate();
  if (missing.length > 0) {
    throw new SecretProviderError(`Missing required secrets: ${missing.join(', ')}`);
  }
}
