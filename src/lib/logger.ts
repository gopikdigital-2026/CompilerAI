import { track } from './telemetry';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  durationMs?: number;
}

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'key', 'authorization', 'email', 'apikey', 'api_key'];

function sanitize(context: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(context)) {
    const lowerKey = k.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      clean[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      clean[k] = sanitize(v as Record<string, unknown>);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, durationMs?: number): void {
  const entry: LogEntry = {
    level,
    message,
    context: context ? sanitize(context) : undefined,
    timestamp: new Date().toISOString(),
    durationMs,
  };

  if (level === 'error') {
    console.error(`[${entry.timestamp}] ERROR: ${message}`, entry.context ?? '');
  } else if (level === 'warn') {
    console.warn(`[${entry.timestamp}] WARN: ${message}`, entry.context ?? '');
  } else if (import.meta.env.DEV && level === 'debug') {
    console.debug(`[${entry.timestamp}] DEBUG: ${message}`, entry.context ?? '');
  }

  track(`log_${level}`, { message, ...entry.context, ...(durationMs !== undefined ? { durationMs } : {}) });
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
  timing: (msg: string, durationMs: number, ctx?: Record<string, unknown>) => log('info', msg, ctx, durationMs),
  supabaseError: (msg: string, error: { message: string; code?: string }, ctx?: Record<string, unknown>) =>
    log('error', `Supabase: ${msg}`, { errorCode: error.code, errorMessage: error.message, ...ctx }),
  apiError: (msg: string, status: number, ctx?: Record<string, unknown>) =>
    log('error', `API: ${msg}`, { status, ...ctx }),
};

export function withTiming<T extends (...args: never[]) => unknown>(fn: T, label: string): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = fn(...args);
    if (result instanceof Promise) {
      return result.then((res) => { logger.timing(label, Math.round(performance.now() - start)); return res; });
    }
    logger.timing(label, Math.round(performance.now() - start));
    return result;
  }) as T;
}
