import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface CliConfig {
  apiKey: string | null;
  organizationId: string | null;
  baseUrl: string | null;
  timeoutMs: number | null;
}

const CONFIG_DIR = join(homedir(), '.compilerai');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: CliConfig = {
  apiKey: null,
  organizationId: null,
  baseUrl: null,
  timeoutMs: null,
};

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

function redactForDisplay(cfg: CliConfig): Record<string, string | number | null> {
  return {
    apiKey: cfg.apiKey ? `${cfg.apiKey.slice(0, 4)}****${cfg.apiKey.slice(-4)}` : null,
    organizationId: cfg.organizationId,
    baseUrl: cfg.baseUrl,
    timeoutMs: cfg.timeoutMs,
  };
}

export class ConfigStore {
  static load(): CliConfig {
    if (!existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG };
    }
    try {
      const raw = readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<CliConfig>;
      return {
        apiKey: parsed.apiKey ?? null,
        organizationId: parsed.organizationId ?? null,
        baseUrl: parsed.baseUrl ?? null,
        timeoutMs: parsed.timeoutMs ?? null,
      };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  static save(cfg: CliConfig): void {
    ensureConfigDir();
    writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
    chmodSync(CONFIG_FILE, 0o600);
  }

  static set(key: keyof CliConfig, value: string): void {
    const cfg = this.load();
    if (key === 'timeoutMs') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1) {
        throw new Error(`timeoutMs must be a positive number, got: ${value}`);
      }
      cfg.timeoutMs = num;
    } else if (key === 'apiKey' || key === 'organizationId' || key === 'baseUrl') {
      if (!value || value.trim().length === 0) {
        throw new Error(`${key} must not be empty`);
      }
      cfg[key] = value.trim();
    } else {
      throw new Error(`Unknown config key: ${key}`);
    }
    this.save(cfg);
  }

  static display(): Record<string, string | number | null> {
    return redactForDisplay(this.load());
  }

  static getConfigPath(): string {
    return CONFIG_FILE;
  }

  static isConfigured(): boolean {
    const cfg = this.load();
    return cfg.apiKey !== null && cfg.organizationId !== null;
  }
}
