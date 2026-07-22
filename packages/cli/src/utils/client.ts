import { ConfigStore } from '../config/store.js';
import type { CliConfig } from '../config/store.js';
import { CompilerAI } from '@compilerai/sdk-typescript';
import type { CompilerAIConfig } from '@compilerai/sdk-typescript';

export interface ResolvedCliOptions {
  apiKey: string;
  organizationId: string;
  baseUrl: string;
  timeoutMs: number;
}

export function resolveOptions(flags: Partial<ResolvedCliOptions>): ResolvedCliOptions {
  const cfg: CliConfig = ConfigStore.load();

  const apiKey = flags.apiKey ?? cfg.apiKey;
  const organizationId = flags.organizationId ?? cfg.organizationId;
  const baseUrl = flags.baseUrl ?? cfg.baseUrl ?? 'http://localhost:3000';
  const timeoutMs = flags.timeoutMs ?? cfg.timeoutMs ?? 30_000;

  if (!apiKey) {
    throw new ConfigError('No API key configured. Run `compiler init` or use --api-key flag.');
  }
  if (!organizationId) {
    throw new ConfigError('No organization ID configured. Run `compiler init` or use --organization-id flag.');
  }

  return { apiKey, organizationId, baseUrl, timeoutMs };
}

export function createClient(opts: ResolvedCliOptions): CompilerAI {
  const config: CompilerAIConfig = {
    apiKey: opts.apiKey,
    organizationId: opts.organizationId,
    baseUrl: opts.baseUrl,
    timeoutMs: opts.timeoutMs,
    maxRetries: 2,
  };
  return new CompilerAI(config);
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}
