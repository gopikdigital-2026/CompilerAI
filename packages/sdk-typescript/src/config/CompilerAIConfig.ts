import { DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS, DEFAULT_MAX_RETRIES, DEFAULT_RETRY_DELAY_MS } from './constants';

export interface CompilerAIConfig {
  apiKey: string;
  organizationId: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  fetch?: typeof fetch;
}

export class ResolvedConfig {
  readonly apiKey: string;
  readonly organizationId: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly fetchFn: typeof fetch;

  constructor(input: CompilerAIConfig) {
    if (!input.apiKey || typeof input.apiKey !== 'string') {
      throw new Error('CompilerAI: apiKey is required and must be a non-empty string');
    }
    if (!input.organizationId || typeof input.organizationId !== 'string') {
      throw new Error('CompilerAI: organizationId is required and must be a non-empty string');
    }
    if (input.organizationId.length > 256) {
      throw new Error('CompilerAI: organizationId must not exceed 256 characters');
    }

    this.apiKey = input.apiKey;
    this.organizationId = input.organizationId;
    this.baseUrl = (input.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = input.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = input.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.fetchFn = input.fetch ?? globalThis.fetch.bind(globalThis);

    if (this.timeoutMs < 1) {
      throw new Error('CompilerAI: timeoutMs must be >= 1');
    }
    if (this.maxRetries < 0) {
      throw new Error('CompilerAI: maxRetries must be >= 0');
    }
  }
}
